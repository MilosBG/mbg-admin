"use client";

import { useState } from "react";
import toast from "react-hot-toast";

import Input from "@/components/mbg-components/Input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const SHIPMENT_LABEL_CLASS =
  "text-[10px] font-semibold uppercase tracking-widest text-mbg-black/70";

type ShipmentEditorProps = {
  orderId: string;
  initialTrackingNumber?: string | null;
  initialTransporter?: string | null;
  initialDateMailed?: string | null;
};

const PAYMENT_STATUSES = ["PENDING", "PAID", "NOT PAID"] as const;
const PAYMENT_STATUS_BADGE: Record<(typeof PAYMENT_STATUSES)[number], string> = {
  PENDING: "rounded-xs tracking-widest bg-mbg-gold/50 text-mbg-black",
  PAID: "rounded-xs tracking-widest bg-mbg-green/50 text-mbg-black",
  "NOT PAID": "rounded-xs tracking-widest bg-mbg-red/50 text-mbg-white",
};

type PaymentEditorProps = {
  orderId: string;
  initialStatus?: string | null;
  onStatusSync?: (next: string) => void;
};

const normalizePaymentStatus = (raw: unknown): (typeof PAYMENT_STATUSES)[number] => {
  const value = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  if ((PAYMENT_STATUSES as readonly string[]).includes(value)) {
    return value as (typeof PAYMENT_STATUSES)[number];
  }
  if (value === "COMPLETED") return "PAID";
  if (value === "VOIDED") return "NOT PAID";
  if (value === "CREATED" || value === "PROCESSING" || value === "PENDIND") return "PENDING";
  return "PENDING";
};

const formatInputDate = (value?: string | null) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};

export function ShipmentEditor(props: ShipmentEditorProps) {
  const [trackingNumber, setTrackingNumber] = useState(() => props.initialTrackingNumber ?? "");
  const [transporter, setTransporter] = useState(() => props.initialTransporter ?? "");
  const [dateMailed, setDateMailed] = useState(() => formatInputDate(props.initialDateMailed));
  const [saving, setSaving] = useState(false);

  async function saveShipment() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        trackingNumber,
        transporter,
      };
      if (dateMailed) payload.dateMailed = dateMailed;

      const res = await fetch(`/api/orders/${props.orderId}/shipping`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || `HTTP ${res.status}`);
      }
      toast.success("Shipment details saved");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save shipment";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 border border-mbg-green/40 bg-mbg-green/10 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-mbg-black">Shipment</p>
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <span className={SHIPMENT_LABEL_CLASS}>Tracking #</span>
          <Input
            placeholder="Tracking #"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
          />
        </div>
        <div>
          <span className={SHIPMENT_LABEL_CLASS}>Transporter</span>
          <Input
            placeholder="Transporter"
            value={transporter}
            onChange={(e) => setTransporter(e.target.value)}
          />
        </div>
        <div>
          <span className={SHIPMENT_LABEL_CLASS}>Date mailed</span>
          <Input
            type="date"
            placeholder="jj/mm/aaaa"
            value={dateMailed}
            onChange={(e) => setDateMailed(e.target.value)}
          />
        </div>
      </div>
      <button
        type="button"
        className={cn(
          "self-start rounded-xs border border-mbg-green px-3 py-1 text-xs font-semibold uppercase tracking-widest text-mbg-green transition",
          saving ? "opacity-60" : "hover:bg-mbg-green/10",
        )}
        onClick={saveShipment}
        disabled={saving}
      >
        {saving ? "Saving..." : "Save shipment"}
      </button>
    </div>
  );
}

export function PaymentStatusEditor(props: PaymentEditorProps) {
  const [value, setValue] = useState(() => normalizePaymentStatus(props.initialStatus));
  const [saving, setSaving] = useState(false);

  async function update(nextRaw: string) {
    const next = normalizePaymentStatus(nextRaw);
    if (next === value) return;
    const prev = value;
    setValue(next);
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${props.orderId}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || `HTTP ${res.status}`);
      }
      props.onStatusSync?.(next);
      toast.success("Payment status updated");
    } catch (err) {
      setValue(prev);
      const message = err instanceof Error ? err.message : "Failed to update payment status";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 border border-mbg-green/40 bg-mbg-green/10 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-mbg-black">Payment</p>
      <Badge className={PAYMENT_STATUS_BADGE[value] || PAYMENT_STATUS_BADGE.PENDING}>{value}</Badge>
      <select
        className="w-full rounded-xs border border-mbg-green bg-white px-3 py-2 text-xs uppercase tracking-widest text-mbg-black"
        value={value}
        onChange={(e) => update(e.target.value)}
        disabled={saving}
      >
        {PAYMENT_STATUSES.map((statusOption) => (
          <option key={statusOption} value={statusOption}>
            {statusOption}
          </option>
        ))}
      </select>
    </div>
  );
}
