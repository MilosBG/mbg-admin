/* eslint-disable @typescript-eslint/no-explicit-any */
import Container from "@/components/mbg-components/Container";
import { DataTable } from "@/components/mbg-components/DataTable";
import { H2 } from "@/components/mbg-components/H2";
import Separator from "@/components/mbg-components/Separator";
import { columns } from "@/components/orderItems/OrderItemsColumns";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import React from "react";

export const dynamic = "force-dynamic";



type OrderDetailsRes = {
  orderDetails: any;
  customer: null | { _id: string; name?: string; email?: string };
};

const OrderDetails = async ({ params }: { params: Promise<{ orderId: string }> }) => {
  const { orderId } = await params;
  const base = process.env.ECOMMERCE_ADMIN_URL || "";
  const target = base ? `${base}/api/orders/${orderId}` : `/api/orders/${orderId}`;
  const headers: Record<string, string> = {};
  const serviceToken = process.env.ADMIN_SERVICE_TOKEN || process.env.STOREFRONT_SERVICE_TOKEN;
  if (serviceToken) {
    headers.Authorization = `Bearer ${serviceToken}`;
  }
  const res = await fetch(
    target,
    {
      // IMPORTANT: avoid stale cached response with customer=null
      cache: "no-store", // or next: { revalidate: 0 }
      headers,
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to load order (${res.status})`);
  }

  const { orderDetails, customer } = (await res.json()) as OrderDetailsRes;

  const addr = orderDetails?.shippingAddress ?? {};
  const { street = "", city = "", state = "", postalCode = "", country = "" } = addr;

  const customerName = customer?.name ?? "N/A";
  const customerEmail = customer?.email ?? "N/A";

  // Compact status timeline + friendly messages
  const STATUS_MESSAGES: Record<string, string> = {
    PENDING: "Order received. We will start processing soon.",
    PROCESSING: "We're preparing your order.",
    SHIPPED: "Your order is on the way.",
    DELIVERED: "Your order has been delivered.",
    COMPLETED: "Order completed. Thank you!",
    CANCELLED: "Order was cancelled.",
  };

  const timelineItems: Array<{ k: string; label: string; at?: string | Date; code: string } > = [
    { k: "processingAt", label: "Processing", at: orderDetails?.processingAt, code: "PROCESSING" },
    { k: "shippedAt", label: "Shipped", at: orderDetails?.shippedAt, code: "SHIPPED" },
    { k: "deliveredAt", label: "Delivered", at: orderDetails?.deliveredAt, code: "DELIVERED" },
    { k: "completedAt", label: "Completed", at: orderDetails?.completedAt, code: "COMPLETED" },
    { k: "cancelledAt", label: "Cancelled", at: orderDetails?.cancelledAt, code: "CANCELLED" },
  ];

  const status: string = String(orderDetails?.fulfillmentStatus || "PENDING").toUpperCase();
  const STATUS_COLORS: Record<string, string> = {
    PENDING: "rounded-xs tracking-widest shadow-sm bg-gray-200 text-gray-700",
    PROCESSING: "rounded-xs tracking-widest shadow-sm bg-blue-200 text-blue-700",
    SHIPPED: "rounded-xs tracking-widest shadow-sm bg-purple-200 text-purple-700",
    DELIVERED: "rounded-xs tracking-widest shadow-sm bg-teal-200 text-teal-800",
    COMPLETED: "rounded-xs tracking-widest shadow-sm bg-green-200 text-green-700",
    CANCELLED: "rounded-xs tracking-widest shadow-sm bg-red-200 text-red-700",
  };

  return (
    <Container>
      <H2>
        Order ID{" "}
        <span className="text-mbg-green text-md font-extrabold uppercase">
          {orderDetails?._id}
        </span>
      </H2>
      <div className="mt-2">
        <Badge className={STATUS_COLORS[status] || "bg-gray-200 text-gray-700"}>
          {status}
        </Badge>
      </div>

      {/* Friendly status message */}
      <p className="mt-2 body-medium text-mbg-green">
        {STATUS_MESSAGES[status] || ""}
      </p>

      <Separator className="bg-mbg-black mt-2 mb-4" />

      <div className="bg-mbg-black/7 p-4 mt-10">
        <p className="body-medium text-mbg-black mt-3 uppercase">
          Customer Name{" "}
          <span className="body-medium text-mbg-green uppercase">
            {customerName}
          </span>
        </p>

        <p className="body-medium text-mbg-black mt-3 uppercase">
          Customer Email{" "}
          <span className="body-medium text-mbg-green uppercase">
            {customerEmail}
          </span>
        </p>

        <p className="body-medium text-mbg-black mt-3 uppercase">
          Shipping Address{" "}
          <span className="body-medium text-mbg-green uppercase">
            {[street, city, state, postalCode, country].filter(Boolean).join(", ")}
          </span>
        </p>

        <p className="body-medium text-mbg-black mt-3 uppercase">
          Total Paid{" "}
          <span className="body-medium text-mbg-green uppercase">
            € {orderDetails?.totalAmount ?? 0}
          </span>
        </p>

        <p className="body-medium text-mbg-black mt-3 uppercase">
          Shipping Rate{" "}
          <span className="body-medium text-mbg-green uppercase">
            {orderDetails?.shippingRate ?? "N/A"}
          </span>
        </p>

        {/* Compact timeline */}
        <div className="mt-4 mb-4 ">
          <p className="body-medium text-mbg-black mt-3 uppercase mb-2">Status Timeline</p>
          <ul className="text-xs space-y-1  bg-mbg-green/7 border border-mbg-green px-2 py-2">
            {timelineItems
              .filter((t) => !!t.at)
              .map((t) => (
                <li key={t.k} className="flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-mbg-green" />
                  <span className="font-bold tracking-widest text-[10px] uppercase">{t.label}</span>
                  <span className="text-mbg-black/70 text-[10px]">
                    {typeof t.at === "string" || t.at instanceof String
                      ? format(new Date(String(t.at)), "MMM d, yyyy HH:mm")
                      : format(new Date(t.at as Date), "MMM d, yyyy HH:mm")}
                  </span>
                  <span className="text-mbg-black/50 text-[10px] uppercase tracking-wide">— {STATUS_MESSAGES[t.code] || ""}</span>
                </li>
              ))}
            {timelineItems.every((t) => !t.at) && (
              <li className="text-mbg-black/60">No timeline entries yet.</li>
            )}
          </ul>
        </div>

        <DataTable
          columns={columns}
          data={Array.isArray(orderDetails?.products) ? orderDetails.products : []}
          searchKey="product"
        
        />
      </div>
    </Container>
  );
};

export default OrderDetails;
