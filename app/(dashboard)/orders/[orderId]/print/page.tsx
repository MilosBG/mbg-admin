/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import AutoPrintOnLoad from "@/components/orders/AutoPrintOnLoad";


// import QRCode from "@/components/orders/QRCode";
import { format } from "date-fns";

export const dynamic = "force-dynamic";


type OrderDetailsRes = {
  orderDetails: any;
  customer: null | { _id: string; name?: string; email?: string };
};

export default async function PrintOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const base = process.env.ECOMMERCE_ADMIN_URL || "";
  const target = base ? `${base}/api/orders/${orderId}` : `/api/orders/${orderId}`;
  const headers: Record<string, string> = {};
  const serviceToken = process.env.ADMIN_SERVICE_TOKEN || process.env.STOREFRONT_SERVICE_TOKEN;
  if (serviceToken) {
    headers.Authorization = `Bearer ${serviceToken}`;
  }
  const res = await fetch(target, { cache: "no-store", headers });
  if (!res.ok) throw new Error(`Failed to load order (${res.status})`);
  const { orderDetails, customer } = (await res.json()) as OrderDetailsRes;

  const addr = orderDetails?.shippingAddress ?? {};
  const created = orderDetails?.createdAt ? new Date(orderDetails.createdAt) : new Date();
  const dateMailed = orderDetails?.dateMailed ? new Date(orderDetails.dateMailed) : null;
  const shippingMethod = orderDetails?.shippingMethod || inferMethod(orderDetails?.shippingRate);
  const trackingNumber = orderDetails?.trackingNumber || "";
  const weightGrams: number | null = typeof orderDetails?.weightGrams === "number" ? orderDetails.weightGrams : null;
  const tn = String(trackingNumber || "").replace(/\s+/g, "");
  function trackingUrl(code: string) {
    const tmpl = process.env.NEXT_PUBLIC_TRACKING_URL_TEMPLATE || process.env.TRACKING_URL_TEMPLATE || "https://www.laposte.fr/outils/suivre-vos-envois?code={code}";
    return tmpl.replace("{code}", encodeURIComponent(code));
  }
  const isEAN13 = /^\d{12,13}$/.test(tn);
  const barcodeFormat = isEAN13 ? "EAN13" : "CODE39"; // EAN13 for 12/13-digit numeric, else CODE39

  const SENDER_NAME = "Milos BG";
  const SENDER_SITE = "www.milos-bg.com";

  return (
    <html>
      <head>
        <title>Order {orderId} - Print</title>
        <style>{`
          /* Hide dashboard chrome (LeftSideBar, TopBar) for this page */
          body > div > :nth-child(-n+2) { display: none !important; }
          body > div { display: block !important; }
          /* One-page print tuning */
          @page { size: A4; margin: 10mm; }
          @media print {
            html, body { height: auto !important; overflow: visible !important; }
            body { margin: 0 !important; }
            .wrap { page-break-inside: avoid; }
            .section { break-inside: avoid; page-break-inside: avoid; }
            .section:last-child { page-break-after: avoid; }
          }
          body { font-family: Kanit, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; font-size: 12px; color: #1a1a1a; }
          .wrap { max-width: 900px; margin: 0 auto; }
          .section { margin: 10px 0; border: 1px solid rgba(0,0,0,0.12); border-radius: 4px; }
          .section .inner { padding: 10px 12px; }
          .title { font-weight: 700; text-transform: uppercase; color: #111; margin: 0; padding: 8px 12px; border-bottom: 1px solid rgba(0,0,0,0.12); background: #fff; }
          .grid { display: grid; grid-template-columns: repeat(6, 1fr); align-items: center; gap: 12px; }
          .flo { display: flex; flex-direction: column; align-items: flex-start; }
          .cell { grid-column: span 2; min-width: 180px; }
          .label { color: #646464; text-transform: uppercase; }
          .value { color: #00821a; font-weight: 500; }
          .muted { color: #646464; }
          .footerRow { display: grid; grid-template-columns: 160px 1fr 140px 120px; gap: 12px; align-items: center; }
          .hr { height: 1px; background: rgba(0,0,0,0.12); margin: 0; border: 0; }
          .space { height: 8px; }
        `}</style>
      </head>
      <body>
        <AutoPrintOnLoad />
        <div className="wrap">
          <div className="section">
            <h3 className="title">SENDER INFORMATION</h3>
            <div className="inner">
              <div className="grid">
                <div className="cell"><span className="label">From{" "}</span> <span className="value">{SENDER_NAME}</span></div>
                <div className="cell"><span className="label">Website{" "}</span> <span className="value">{SENDER_SITE}</span></div>
              </div>
            </div>
          </div>

          <div className="section">
            <h3 className="title">RECIPIENT INFORMATION</h3>
            <div className="inner">
              <div className="flo">
                <div className="cell"><span className="label">To{" "}</span> <span className="value">{customer?.name || customer?.email || "N/A"}</span></div>
                <div className="cell"><span className="label">Address{" "}</span> <span className="value">{addr?.street || ""}</span></div>
                <div className="cell"><span className="label">City{" "}</span> <span className="value">{addr?.city || ""}</span></div>
                <div className="cell"><span className="label">Postal Code{" "}</span> <span className="value">{addr?.postalCode || ""}</span></div>
                <div className="cell"><span className="label">Country{" "}</span> <span className="value">{addr?.country || ""}</span></div>
              </div>
            </div>
          </div>

          <div className="section">
            <h3 className="title">SHIPMENT DETAILS</h3>
            <div className="inner">
              <div className="grid">
                <div className="cell"><span className="label">Shipping Method{" "}</span> <span className="value">{shippingMethod || "N/A"}</span></div>
                <div className="cell"><span className="label">Date Mailed{" "}</span> <span className="value">{dateMailed ? format(dateMailed, "MMM d, yyyy") : "N/A"}</span></div>
                <div className="cell"><span className="label">Weight{" "}</span> <span className="value">{weightGrams != null ? `${weightGrams} g` : "N/A"}</span></div>
                <div className="cell"><span className="label">Order ID{" "}</span> <span className="value">{orderId}</span></div>
              </div>
            </div>
          </div>

          <div className="section">
            <h3 className="title">TRACKING INFORMATION</h3>
            <div className="inner">
              <div className="grid">
                <div className="cell"><span className="label">Tracking number{" "}</span> <span className="value">{trackingNumber || "N/A"}</span></div>
              </div>
              {tn ? (
                <div style={{ marginTop: 8 }}>
                  <div className="label" style={{ marginBottom: 4 }}>LINK Tracking code{" "}</div>
                  {/* <div style={{ display: "inline-block", padding: 4, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 4 }}>
                    <QRCode value={trackingUrl(tn)} size={160} />
                  </div> */}
                  <div className="value" style={{ marginTop: 6, fontSize: 11 }}>
                    {trackingUrl(tn)}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="section" style={{ marginTop: 12 }}>
            <div className="inner">
              <div className="footerRow">
                <div className="label">Order Date{" "}</div>
                <div className="value">{format(created, "MMM d, yyyy HH:mm")}</div>
                <div className="label">Total Amount{" "}</div>
                <div className="value">€ {orderDetails?.totalAmount ?? 0}</div>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

function inferMethod(rate?: string | null) {
  if (!rate) return null;
  const r = String(rate).toLowerCase();
  if (r.includes("free")) return "FREE";
  if (r.includes("express")) return "EXPRESS";
  return null;
}
