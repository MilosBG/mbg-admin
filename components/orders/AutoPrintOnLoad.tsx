"use client";
import { useEffect } from "react";

export default function AutoPrintOnLoad() {
  useEffect(() => {
    let done = false;
    function triggerPrint() {
      if (done) return; done = true;
      try { window.focus(); window.print(); } catch {}
      setTimeout(() => { try { window.close(); } catch {} }, 800);
    }

    const start = Date.now();
    const maxWait = 3000; // wait up to 3s for code readiness (barcode/QR)
    const interval = setInterval(() => {
      const elList = document.querySelectorAll('[data-barcode], [data-qr]');
      if (!elList.length) {
        if (Date.now() - start > 600) { // no barcode on page, don't hold too long
          clearInterval(interval); triggerPrint();
        }
        return;
      }
      const allReady = Array.from(elList).every((el) => (
        el.getAttribute('data-barcode-ready') === '1' ||
        el.getAttribute('data-qr-ready') === '1'
      ));
      if (allReady || Date.now() - start > maxWait) {
        clearInterval(interval); triggerPrint();
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);
  return null;
}
