/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useEffect, useRef } from "react";

type Props = {
  value: string | number;
  className?: string;
  format?: "CODE128" | "CODE39" | "EAN13" | string;
  height?: number;
  width?: number;
  idAttr?: string; // optional id for readiness checks
};

export default function Barcode({ value, className, format = "CODE128", height = 60, width = 2, idAttr }: Props) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      if (!ref.current || value === undefined || value === null || String(value).trim() === "") return;
      try {
        const mod: any = await import("jsbarcode");
        const JsBarcode: any = mod?.default || mod; // handle both module formats
        if (cancelled) return;
        JsBarcode(ref.current, String(value), {
          format,
          displayValue: true,
          fontSize: 12,
          width,
          height,
          margin: 0,
        });
        try {
          ref.current?.setAttribute("data-barcode-ready", "1");
        } catch {}
      } catch (e) {
        console.error("Barcode render error", e);
      }
    }
    render();
    return () => {
      cancelled = true;
    };
  }, [value, format, height, width]);

  if (value === undefined || value === null || String(value).trim() === "") return null;
  return <svg ref={ref} className={className} data-barcode={idAttr || "1"} />;
}
