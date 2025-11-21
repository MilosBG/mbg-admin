/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */
"use client";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Badge } from "../ui/badge";
import Input from "@/components/mbg-components/Input";
import React, { useState } from "react";
import toast from "react-hot-toast";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "rounded-xs tracking-widest shadow-sm bg-gray-200 text-gray-700",
  PROCESSING: "rounded-xs tracking-widest shadow-sm bg-blue-200 text-blue-700",
  SHIPPED: "rounded-xs tracking-widest shadow-sm bg-purple-200 text-purple-700",
  DELIVERED: "rounded-xs tracking-widest shadow-sm bg-teal-200 text-teal-800",
  COMPLETED: "rounded-xs tracking-widest shadow-sm bg-green-200 text-green-700",
  CANCELLED: "rounded-xs tracking-widest shadow-sm bg-red-200 text-red-700",
};

const ALL_STATUSES = [
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
] as const;

const ALLOWED: Record<string, string[]> = {
  PENDING: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};
const PAYMENT_STATUSES = ["PENDING", "PAID", "NOT PAID"] as const;

const PAYMENT_STATUS_BADGE: Record<(typeof PAYMENT_STATUSES)[number], string> = {
  PENDING: "rounded-xs tracking-widest bg-mbg-gold/50 text-mbg-black",
  PAID: "rounded-xs tracking-widest bg-mbg-green/50 text-mbg-black",
  "NOT PAID": "rounded-xs tracking-widest bg-mbg-red/50 text-mbg-white",
};

function normalizePaymentStatus(raw: unknown): (typeof PAYMENT_STATUSES)[number] {
  const value = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  if ((PAYMENT_STATUSES as readonly string[]).includes(value)) {
    return value as (typeof PAYMENT_STATUSES)[number];
  }
  if (value === "COMPLETED") return "PAID";
  if (value === "VOIDED") return "NOT PAID";
  if (value === "CREATED" || value === "PROCESSING" || value === "PENDIND") return "PENDING";
  return "PENDING";
}

export function orderColumns(opts?: {
  onStatusChange?: (id: string, next: string) => void;
  onShipmentChange?: (
    id: string,
    patch: { trackingNumber?: string | null; transporter?: string | null; dateMailed?: string | null },
  ) => void;
  onPaymentStatusChange?: (id: string, next: string) => void;
}): ColumnDef<OrderColumnType>[] {
  return [
    {
      accessorKey: "_id",
      header: "Order",
      cell: ({ row }) => <Link href={`/orders/${row.original._id}`}>{row.original._id}</Link>,
    },
    {
      accessorKey: "shippingMethod",
      header: "Ship Method",
      cell: ({ row }) => {
        const value = (row.original as any).shippingMethod || "";
        return <span className="text-xs">{value || "-"}</span>;
      },
    },
    {
      id: "shipmentDetails",
      header: "Shipment",
      cell: ({ row }) => {
        const orig: any = row.original as any;
        const [tracking, setTracking] = useState(orig.trackingNumber || "");
        const [transporter, setTransporter] = useState(orig.transporter || "");
        const [dateMailed, setDateMailed] = useState(
          orig.dateMailed ? String(orig.dateMailed).slice(0, 10) : "",
        );
        const [saving, setSaving] = useState(false);

        async function save() {
          setSaving(true);
          try {
            const payload: any = {
              trackingNumber: tracking || null,
              transporter: transporter || null,
            };
            if (dateMailed) payload.dateMailed = dateMailed;
            const res = await fetch(`/api/orders/${orig._id}/shipping`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error(await res.text());
            opts?.onShipmentChange?.(orig._id, {
              trackingNumber: payload.trackingNumber ?? null,
              transporter: payload.transporter ?? null,
              dateMailed: payload.dateMailed ?? null,
            });
            toast.success("Shipment details saved");
          } catch (e: any) {
            toast.error(e?.message || "Failed to save");
          } finally {
            setSaving(false);
          }
        }

        return (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Tracking #"
              className="w-28"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
            />
            <Input
              placeholder="Transporter"
              className="w-28"
              value={transporter}
              onChange={(e) => setTransporter(e.target.value)}
            />
            <Input
              placeholder="jj/mm/aaaa"
              className="w-28"
              type="date"
              value={dateMailed}
              onChange={(e) => setDateMailed(e.target.value)}
            />
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="text-xs px-2 py-1 rounded-xs border hover:bg-mbg-black/5 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        );
      },
    },
    {
      accessorKey: "customer",
      header: "Customer",
    },
    {
      id: "paymentStatus",
      header: "Payment",
      cell: ({ row }) => {
        const paymentStatus = normalizePaymentStatus((row.original as any).paymentStatus);
        const [value, setValue] = useState(paymentStatus);

        async function update(next: string) {
          const upper = normalizePaymentStatus(next);
          if (!PAYMENT_STATUSES.includes(upper)) return;
          const prev = value;
          setValue(upper);
          try {
            const res = await fetch(`/api/orders/${row.original._id}/payment`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: upper }),
            });
            if (!res.ok) {
              const txt = await res.text();
              throw new Error(txt || `HTTP ${res.status}`);
            }
            opts?.onPaymentStatusChange?.(row.original._id, upper);
            toast.success("Payment status updated");
          } catch (err: any) {
            setValue(prev);
            toast.error(err?.message || "Failed to update payment status");
          }
        }

        return (
          <div className="flex flex-col gap-1 text-xs">
            <Badge className={PAYMENT_STATUS_BADGE[value] || PAYMENT_STATUS_BADGE.PENDING}>
              {value}
            </Badge>
            <select
              className="border rounded-xs text-xs px-2 py-1 mt-1"
              value={value}
              onChange={(e) => update(e.target.value)}
            >
              {PAYMENT_STATUSES.map((statusOption) => (
                <option key={statusOption} value={statusOption}>
                  {statusOption}
                </option>
              ))}
            </select>
          </div>
        );
      },
    },
    {
      accessorKey: "fulfillmentStatus",
      header: "Status",
      cell: ({ row }) => {
        const start = (row.original.fulfillmentStatus || "PENDING").toUpperCase();
        const [value, setValue] = useState(start);
        const allowed = new Set([value, ...(ALLOWED[value] || [])]);

        async function update(next: string) {
          if (!allowed.has(next)) return;
          const prev = value;
          setValue(next);
          try {
            const res = await fetch(`/api/orders/${row.original._id}/status`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: next }),
            });
            if (!res.ok) {
              const txt = await res.text();
              throw new Error(txt || `HTTP ${res.status}`);
            }
            toast.success("Status updated");
            opts?.onStatusChange?.(row.original._id, next);
          } catch (e: any) {
            setValue(prev);
            toast.error(e?.message || "Failed to update");
          }
        }

        return (
          <div className="flex flex-col gap-1">
            <Badge className={STATUS_COLORS[value] || "bg-gray-200 text-gray-700"}>{value}</Badge>
            <select
              className="border rounded-xs text-xs px-2 py-1"
              value={value}
              onChange={(e) => update(e.target.value)}
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s} disabled={!allowed.has(s)}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
    },
  ];
}
