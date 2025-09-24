/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */
"use client";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Badge } from "../ui/badge";
import Input from "@/components/mbg-components/Input";
import React, { useState } from "react";
import { Printer } from "lucide-react";
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

function openPrint(orderId: string) {
  try {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "-10000px";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.src = `/orders/${orderId}/print`;
    iframe.onload = () => {
      try { iframe.contentWindow?.print(); } catch {}
      setTimeout(() => { try { iframe.remove(); } catch {} }, 1200);
    };
    document.body.appendChild(iframe);
  } catch {}
}

export function orderColumns(opts?: { 
  onStatusChange?: (id: string, next: string) => void,
  onShipmentChange?: (id: string, patch: { trackingNumber?: string | null; weightGrams?: number | null; dateMailed?: string | null }) => void,
}): ColumnDef<OrderColumnType>[] {
  return [
  {
    accessorKey: "_id",
    header: "Order",
    cell: ({ row }) => (
      <Link href={`/orders/${row.original._id}`}>{row.original._id}</Link>
    ),
  },
  {
    accessorKey: "shippingMethod",
    header: "Ship Method",
    cell: ({ row }) => {
      const value = (row.original as any).shippingMethod || "";
      return (
        <span className="text-xs">
          {value || "-"}
        </span>
      );
    },
  },
  {
    id: "shipmentDetails",
    header: "Shipment",
    cell: ({ row }) => {
      const orig: any = row.original as any;
      const [tracking, setTracking] = useState(orig.trackingNumber || "");
      const [weight, setWeight] = useState(typeof orig.weightGrams === "number" ? String(orig.weightGrams) : "");
      const [dateMailed, setDateMailed] = useState(
        orig.dateMailed ? String(orig.dateMailed).slice(0, 10) : ""
      );
      const [saving, setSaving] = useState(false);

      async function save() {
        setSaving(true);
        try {
          const payload: any = {
            trackingNumber: tracking || null,
          };
          const n = Number(weight);
          if (!Number.isNaN(n)) payload.weightGrams = n;
          if (dateMailed) payload.dateMailed = dateMailed;
          const res = await fetch(`/api/orders/${orig._id}/shipping`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error(await res.text());
          // Update parent table data so inputs persist after rerenders
          opts?.onShipmentChange?.(orig._id, {
            trackingNumber: payload.trackingNumber ?? null,
            weightGrams: payload.weightGrams ?? null,
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
            placeholder="Weight (g)"
            className="w-24"
            inputMode="numeric"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
          <input
            type="date"
            className="border rounded-xs text-xs px-2 py-1"
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
    accessorKey: "products",
    header: "Products",
  },
  {
    accessorKey: "totalAmount",
    header: "Total Amount",
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
        <div className="flex items-center gap-2">
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
    id: "print",
    header: "Print",
    cell: ({ row }) => (
      <button
        type="button"
        title="Print order"
        onClick={() => openPrint(row.original._id)}
        className="text-xs px-2 py-1 rounded-xs border hover:bg-mbg-black/5"
      >
        <Printer className="inline h-3.5 w-3.5" />
      </button>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
  },
  ];
}
