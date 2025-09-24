/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useEffect, useRef, useState } from "react";

type Props = {
  value: string | number;
  size?: number; // pixels
  level?: "L" | "M" | "Q" | "H";
  className?: string;
};

// SVG-based QR generator using the `qrcode` lib's toString({ type: 'svg' }) API.
// No canvas and no network calls, so it prints reliably.
export default function QRCode({ value, size = 140, level = "M", className }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      const v = String(value ?? "").trim();
      if (!hostRef.current || !v) return;
      try {
        const mod: any = await import("qrcode-generator");
        const QRGen: any = mod?.default || mod; // function(typeNumber, errorCorrectionLevel)
        if (cancelled) return;
        const qr = QRGen(0, level);
        qr.addData(v);
        qr.make();
        const moduleCount = typeof qr.getModuleCount === 'function' ? qr.getModuleCount() : 33;
        const cellSize = Math.max(2, Math.floor(size / moduleCount));
        const svgMarkup: string = qr.createSvgTag({ cellSize, margin: 0 });
        if (cancelled) return;
        setSvg(svgMarkup);
        // mark readiness after it's attached to DOM (next microtask)
        setTimeout(() => {
          try {
            const svgEl = hostRef.current?.querySelector?.('svg');
            if (svgEl) {
              svgEl.setAttribute('width', String(size));
              svgEl.setAttribute('height', String(size));
              (svgEl as any).style.display = 'block';
            }
            hostRef.current?.setAttribute("data-qr-ready", "1");
          } catch {}
        }, 0);
      } catch (e) {
        console.error("QR SVG render error", e);
        setSvg(null);
        try { hostRef.current?.setAttribute("data-qr-ready", "1"); } catch {}
      }
    }
    render();
    return () => { cancelled = true; };
  }, [value, size, level]);

  if (value === undefined || value === null || String(value).trim() === "") return null;
  return (
    <div
      ref={hostRef}
      className={className}
      data-qr
      style={{ width: size, height: size, display: "inline-block" }}
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}
