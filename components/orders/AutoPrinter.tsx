/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useRef, useState } from "react";

type Props = {
  pollMs?: number; // default 15000
  statuses?: string[]; // which statuses to auto-print (default: ["PENDING", "PROCESSING"])
};

function openPrintIframe(orderId: string) {
  try {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "-10000px";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.src = `/orders/${orderId}/print`;
    iframe.onload = () => {
      try {
        const win = iframe.contentWindow;
        if (win) {
          win.focus();
          win.print();
        }
      } catch {}
      setTimeout(() => {
        try { iframe.remove(); } catch {}
      }, 1500);
    };
    document.body.appendChild(iframe);
  } catch {}
}

export default function AutoPrinter({ pollMs = 15000, statuses = ["PENDING", "PROCESSING"] }: Props) {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("mbg_auto_print_enabled") === "1";
  });
  const [intervalMs, setIntervalMs] = useState<number>(() => {
    if (typeof window === "undefined") return pollMs;
    const v = Number(localStorage.getItem("mbg_auto_print_interval") || pollMs);
    return Number.isFinite(v) && v >= 4000 ? v : pollMs;
  });
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(() => {
    if (typeof window === "undefined") return statuses;
    try {
      const raw = localStorage.getItem("mbg_auto_print_statuses");
      const arr = raw ? JSON.parse(raw) : statuses;
      return Array.isArray(arr) && arr.length ? arr : statuses;
    } catch {
      return statuses;
    }
  });
  const printedRef = useRef<Set<string>>(new Set());
  const lastInitRef = useRef<number>(0);

  // Initialize printed set with current orders to avoid backlog
  useEffect(() => {
    if (!enabled) return;
    const init = async () => {
      try {
        const res = await fetch(`/api/orders?limit=50&_=${Date.now()}`, { cache: "no-store" } as any);
        const data = await res.json();
        const list: any[] = Array.isArray(data?.orders) ? data.orders : [];
        list.forEach((o) => printedRef.current.add(String(o._id)));
        lastInitRef.current = Date.now();
      } catch {}
    };
    init();
  }, [enabled]);

  // SSE listener for push notifications
  useEffect(() => {
    if (!enabled) return;
    let src: EventSource | null = null;
    try {
      src = new EventSource(`/api/print/events`);
      src.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data || "{}");
          if (data?.type === "order" && data?.orderId) {
            const st = String(data?.status || "PENDING").toUpperCase();
            if (selectedStatuses.includes(st)) {
              printedRef.current.add(String(data.orderId));
              openPrintIframe(String(data.orderId));
            }
          }
        } catch {}
      };
    } catch {}
    return () => { try { src?.close(); } catch {} };
  }, [enabled, selectedStatuses.join(",")]);

  // Poll for new orders
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders?limit=50&_=${Date.now()}`, { cache: "no-store" } as any);
        const data = await res.json();
        const list: any[] = Array.isArray(data?.orders) ? data.orders : [];
        for (const o of list) {
          const id = String(o._id);
          const st = String(o.fulfillmentStatus || "PENDING").toUpperCase();
          if (!printedRef.current.has(id) && selectedStatuses.includes(st)) {
            printedRef.current.add(id);
            openPrintIframe(id);
          }
        }
      } catch {}
    }, Math.max(4000, intervalMs));
    return () => clearInterval(timer);
  }, [enabled, intervalMs, selectedStatuses.join(",")]);

  // Persist toggle
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("mbg_auto_print_enabled", enabled ? "1" : "0");
    }
  }, [enabled]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("mbg_auto_print_interval", String(intervalMs));
    }
  }, [intervalMs]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("mbg_auto_print_statuses", JSON.stringify(selectedStatuses));
    }
  }, [selectedStatuses]);

  const ALL = ["PENDING","PROCESSING","SHIPPED","DELIVERED","COMPLETED","CANCELLED"];
  const toggleStatus = (s: string) => {
    setSelectedStatuses((prev) => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  return (
    <div className="flex flex-col gap-3 bg-mbg-black/7 py-4 px-3">
      <div className="flex items-center gap-2">
        <label className="text-[10px] font-semibold uppercase text-mbg-black">Auto Print</label>
        <button
          type="button"
          className={`text-xs px-2 py-1 rounded-xs ${enabled ? 'bg-mbg-green text-white' : 'bg-mbg-black/10 text-mbg-black'}`}
          onClick={() => setEnabled((v) => !v)}
        >
          {enabled ? 'ON' : 'OFF'}
        </button>
      </div>
      <div className="flex flex-col md:flex-row items-start gap-1 text-xs">
        <span className="text-[10px] font-semibold uppercase text-mbg-black">Statuses</span>
        {ALL.map((s) => (
          <div key={s} className="bg-mbg-black/7 px-1 py-0.5" >
            <label key={s} className="flex items-center gap-1">
              <input type="checkbox" checked={selectedStatuses.includes(s)} onChange={() => toggleStatus(s)} />
              <span>{s}</span>
            </label>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 text-xs">
        <span className="text-[10px] font-semibold uppercase text-mbg-black">Interval(ms)</span>
        <input
          className="w-20 border rounded-xs px-1 bg-mbg-white"
          type="number"
          min={4000}
          step={1000}
          value={String(intervalMs)}
          onChange={(e) => setIntervalMs(Math.max(4000, Number(e.target.value || 0)))}
        />
      </div>
    </div>
  );
}
