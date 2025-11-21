/* eslint-disable @typescript-eslint/no-explicit-any */
import Customer from "@/lib/models/Customer";
import Order from "@/lib/models/Order";
import { connectToDB } from "@/lib/mongoDB";
import { collapseOrderProducts } from "@/lib/orderProductUtils";

import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";

function formatDateSafe(value: unknown): string {
  if (!value) return "";
  try {
    const date = value instanceof Date ? value : new Date(value as string);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString();
  } catch {
    return "";
  }
}

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
    const orderDetails: any[] = [];

    for (const order of orders) {
      try {
        const rawOrder = order as any;
        const contact = rawOrder.contact || {};
        const shippingAddress = rawOrder.shippingAddress || {};
        const contactEmail =
          typeof contact.email === "string" && contact.email.trim()
            ? contact.email.trim().toLowerCase()
            : "";
        const contactName =
          typeof contact.name === "string" && contact.name.trim() ? contact.name.trim() : "";
        const shippingFullName = [shippingAddress?.firstName, shippingAddress?.lastName]
          .map((part: unknown) => (typeof part === "string" ? part.trim() : ""))
          .filter(Boolean)
          .join(" ");

        // 1) Read current customer doc
        let customerDoc =
          order.customerClerkId
            ? ((await Customer.findOne({ clerkId: order.customerClerkId })
                .select("name email")
                .lean()) as { name?: string; email?: string } | null)
            : null;

        if (!customerDoc && contactEmail) {
          customerDoc = (await Customer.findOne({ email: contactEmail })
            .select("name email")
            .lean()) as { name?: string; email?: string } | null;
        }

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

        const fallbackName = name || contactName || shippingFullName;
        const fallbackEmail = email || contactEmail;

        // 3) Persist any enrichment and link this order to the customer
        if (order.customerClerkId && (fallbackName || fallbackEmail)) {
          try {
            await Customer.updateOne(
              { clerkId: order.customerClerkId },
              {
                $setOnInsert: { clerkId: order.customerClerkId },
                $set: {
                  ...(fallbackName && { name: fallbackName }),
                  ...(fallbackEmail && { email: fallbackEmail }),
                },
                $addToSet: { orders: order._id },
              },
              { upsert: true, setDefaultsOnInsert: true }
            );
          } catch (err) {
            console.warn("[orders_GET] failed to upsert customer", order.customerClerkId, err);
          }
        } else if (!order.customerClerkId && fallbackEmail) {
          const guestSet: Record<string, unknown> = { email: fallbackEmail };
          if (fallbackName) guestSet.name = fallbackName;
          try {
            await Customer.updateOne(
              { email: fallbackEmail },
              {
                $setOnInsert: { email: fallbackEmail },
                $set: guestSet,
                $addToSet: { orders: order._id },
              },
              { upsert: true, setDefaultsOnInsert: true }
            );
          } catch (err) {
            console.warn("[orders_GET] failed to upsert guest customer", fallbackEmail, err);
          }
        }

        if (!name && fallbackName) name = fallbackName;
        if (!email && fallbackEmail) email = fallbackEmail;

        const customerLabel =
          name ||
          email ||
          contactName ||
          contactEmail ||
          shippingFullName ||
          order.customerClerkId ||
          "Unknown";

        const collapsedProducts = collapseOrderProducts(
          Array.isArray(rawOrder.products)
            ? (rawOrder.products as Array<Record<string, unknown>>)
            : [],
        );
        const subtotalFromProducts = collapsedProducts.reduce(
          (sum, item) => sum + Number(item.unitPrice ?? 0) * Number(item.quantity ?? 0),
          0,
        );
        const shippingAmount = Number(rawOrder.shippingAmount ?? 0);
        const subtotalAmount = Number.isFinite(subtotalFromProducts)
          ? Number(subtotalFromProducts.toFixed(2))
          : Number(rawOrder.subtotalAmount ?? rawOrder.totalAmount ?? 0);
        const computedTotal = Number.isFinite(subtotalFromProducts)
          ? Number((subtotalFromProducts + shippingAmount).toFixed(2))
          : Number(order.totalAmount ?? 0);

        orderDetails.push({
          _id: String(order._id),
          customer: customerLabel,
          products: collapsedProducts.length,
          subtotalAmount,
          totalAmount: computedTotal,
          paymentStatus: String(order.status || "PENDING").toUpperCase(),
          fulfillmentStatus: order.fulfillmentStatus || "PENDING",
          shippingMethod: inferMethod(rawOrder.shippingRate, rawOrder.shippingMethod || null),
          trackingNumber: rawOrder.trackingNumber || null,
          transporter: rawOrder.transporter ?? null,
          weightGrams: rawOrder.weightGrams ?? null,
          dateMailed: formatDateSafe(rawOrder.dateMailed) || null,
          shippingRate: rawOrder.shippingRate || null,
          shippingAmount,
          contactEmail: typeof contact.email === "string" ? contact.email : null,
          contactPhone: typeof contact.phone === "string" ? contact.phone : null,
          contactName: typeof contact.name === "string" ? contact.name : null,
          notes: typeof rawOrder.notes === "string" ? rawOrder.notes : null,
          shippingAddress: {
            firstName: typeof shippingAddress.firstName === "string" ? shippingAddress.firstName : null,
            lastName: typeof shippingAddress.lastName === "string" ? shippingAddress.lastName : null,
            street: typeof shippingAddress.street === "string" ? shippingAddress.street : null,
            city: typeof shippingAddress.city === "string" ? shippingAddress.city : null,
            state: typeof shippingAddress.state === "string" ? shippingAddress.state : null,
            postalCode: typeof shippingAddress.postalCode === "string" ? shippingAddress.postalCode : null,
            country: typeof shippingAddress.country === "string" ? shippingAddress.country : null,
            phone: typeof shippingAddress.phone === "string" ? shippingAddress.phone : null,
          },
          productLines: collapsedProducts,
          createdAt: (() => {
            const safe = formatDateSafe(order.createdAt);
            if (!safe) return "";
            try {
              return format(new Date(safe), "yyyy-MM-dd");
            } catch {
              return safe.split("T")[0] ?? "";
            }
          })(),
        });
      } catch (error) {
        console.warn("[orders_GET] skipping malformed order", order?._id, error);
      }
    }

    return NextResponse.json({ orders: orderDetails }, { status: 200 });
  } catch (err) {
    console.error("[orders_GET]", err);
    const message =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message },
      { status: 500 }
    );
  }
};

export const dynamic = "force-dynamic";



