/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Customer from "@/lib/models/Customer";
import Order from "@/lib/models/Order";
import { payPalOrders } from "@/lib/paypal";
import { connectToDB } from "@/lib/mongoDB";

import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";

function inferMethod(rate?: string | null, explicit?: string | null) {
  if (explicit && ["FREE", "EXPRESS"].includes(explicit.toUpperCase())) return explicit.toUpperCase();
  if (!rate) return null;
  const r = String(rate).toLowerCase();
  if (r.includes("free")) return "FREE";
  if (r.includes("express")) return "EXPRESS";
  return null;
}

export const GET = async (req: NextRequest) => {
  try {
    await connectToDB();

    const limitParam = req.nextUrl.searchParams.get("limit");
    const limitVal = limitParam ? Math.max(0, Math.min(500, Number(limitParam))) : 0;

    const query = Order.find().sort({ createdAt: "desc" });
    if (limitVal) query.limit(limitVal);
    const orders = await query;

    const orderDetails = await Promise.all(
      orders.map(async (order) => {
        // 1) Read current customer doc
        let customerDoc = (await Customer
          .findOne({ clerkId: order.customerClerkId })
          .select("name email")
          .lean()) as { name?: string; email?: string } | null;

        let name = (customerDoc?.name || "").trim();
        let email = String(customerDoc?.email || "").trim().toLowerCase();

        // 2) Enrich from Clerk if missing
        if ((!name || !email) && order.customerClerkId && process.env.CLERK_SECRET_KEY) {
          try {
            const res = await fetch(
              `https://api.clerk.com/v1/users/${encodeURIComponent(order.customerClerkId)}` as any,
              { headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` }, cache: "no-store" } as any
            );
            if (res.ok) {
              const u: any = await res.json();
              const n = [u?.first_name, u?.last_name].filter(Boolean).join(" ");
              const primaryEmailId = u?.primary_email_address_id;
              const e = (u?.email_addresses || []).find((x: any) => x.id === primaryEmailId)?.email_address || u?.email_addresses?.[0]?.email_address || "";
              if (!name && n) name = n;
              if (!email && e) email = String(e).toLowerCase();
            }
          } catch {}
        }

        // 3) Enrich from PayPal if still missing and we have a PayPal order id
        if ((!name || !email) && (order as any)?.paypalOrderId) {
          try {
            const { result: paypalOrder } = await payPalOrders.getOrder({ id: String((order as any).paypalOrderId) });
            const payer = paypalOrder.payer || {};
            const payerName = payer?.name as { givenName?: string; surname?: string; given_name?: string } | undefined
            const n = [payerName?.givenName || payerName?.given_name, payerName?.surname]
              .filter(Boolean)
              .join(" ");
            const payerEmail = payer as { emailAddress?: string; email_address?: string }
            const e = payerEmail?.emailAddress || payerEmail?.email_address || "";
            if (!name && n) name = n;
            if (!email && e) email = String(e).toLowerCase();
          } catch {}
        }

        // 4) Persist any enrichment and link this order to the customer
        if (order.customerClerkId && (name || email)) {
          await Customer.updateOne(
            { clerkId: order.customerClerkId },
            {
              $setOnInsert: { clerkId: order.customerClerkId },
              $set: { ...(name && { name }), ...(email && { email }) },
              $addToSet: { orders: order._id },
            },
            { upsert: true, setDefaultsOnInsert: true }
          );
        }

        const customerLabel = name || email || order.customerClerkId || "Unknown";

        return {
          _id: String(order._id),
          customer: customerLabel,
          products: (order.products || []).length,
          totalAmount: order.totalAmount,
          fulfillmentStatus: order.fulfillmentStatus || "PENDING",
          shippingMethod: inferMethod((order as any).shippingRate, (order as any).shippingMethod || null),
          trackingNumber: (order as any).trackingNumber || null,
          weightGrams: (order as any).weightGrams ?? null,
          dateMailed: (order as any).dateMailed ? new Date((order as any).dateMailed).toISOString() : null,
          shippingRate: (order as any).shippingRate || null,
          createdAt: format(new Date(order.createdAt), "MMM do, yyyy"),
        };
      })
    );

    return NextResponse.json({ orders: orderDetails }, { status: 200 });
  } catch (err) {
    console.log("[orders_GET]", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
};

export const dynamic = "force-dynamic";
