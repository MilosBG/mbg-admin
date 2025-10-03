/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@paypal/paypal-server-sdk";
import { payPalOrders } from "@/lib/paypal";
import { connectToDB } from "@/lib/mongoDB";
import Order from "@/lib/models/Order";
import Product from "@/lib/models/Product";
import Customer from "@/lib/models/Customer";
import mongoose from "mongoose";
import emitter from "@/lib/events";

export const dynamic = "force-dynamic";

function corsFor(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  const allowed = [String(process.env.ECOMMERCE_STORE_URL || "")].filter(Boolean);
  const allowAll = process.env.NODE_ENV !== "production";
  const ok = allowAll || allowed.includes(origin);
  return {
    "Access-Control-Allow-Origin": ok ? (allowAll ? "*" : origin) : "",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}

function jsonify(err: any) {
  try {
    return JSON.stringify(
      err?.result || err,
      Object.getOwnPropertyNames(err?.result || err),
      2
    );
  } catch {
    return String(err?.message || err);
  }
}

export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, { headers: corsFor(req) });
}

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();
    if (!orderId || typeof orderId !== "string") {
      return new NextResponse(JSON.stringify({ error: "MISSING_ORDER_ID" }), {
        status: 400,
        headers: corsFor(req),
      });
    }

    // 1) Try to capture (idempotent-friendly)
    let captureOK = false;
    let capturePayload: any = null;

    try {
      const captureRes = await payPalOrders.captureOrder({
        id: orderId,
        body: { paymentSource: { paypal: {} } },
        prefer: "return=representation",
      });
      capturePayload = captureRes.result;
      captureOK = true;
    } catch (e: any) {
      const issue = (e instanceof ApiError ? e.result?.details?.[0]?.issue : e?.result?.details?.[0]?.issue) || "";
      if (issue !== "ORDER_ALREADY_CAPTURED") {
        console.error("[paypal_capture] capture error:", jsonify(e));
      }
      // continue; we'll GET the order next
    }

    // 2) Get full order details
    const { result: ppOrder } = await payPalOrders.getOrder({ id: orderId });

    const status = String(ppOrder.status || "");
    if (!captureOK && status !== "COMPLETED") {
      return new NextResponse(
        JSON.stringify({ error: "CAPTURE_NOT_COMPLETED", status, capture: capturePayload }),
        { status: 409, headers: corsFor(req) }
      );
    }

    // 3) Map fields
    const purchaseUnit = ppOrder.purchaseUnits?.[0];
    const payer = (ppOrder.payer || {}) as any;
    const clerkId = String(purchaseUnit?.referenceId || "");

    const shippingAddress = (() => {
      const addr = purchaseUnit?.shipping?.address as { addressLine1?: string; address_line_1?: string; adminArea2?: string; admin_area_2?: string; adminArea1?: string; admin_area_1?: string; postalCode?: string; postal_code?: string; countryCode?: string; country_code?: string } | undefined
      if (!addr) {
        return { street: '', city: '', state: '', postalCode: '', country: '' }
      }
      return {
        street: addr.addressLine1 ?? addr.address_line_1 ?? '',
        city: addr.adminArea2 ?? addr.admin_area_2 ?? '',
        state: addr.adminArea1 ?? addr.admin_area_1 ?? '',
        postalCode: addr.postalCode ?? addr.postal_code ?? '',
        country: addr.countryCode ?? addr.country_code ?? '',
      }
    })();

    const orderItems = (purchaseUnit?.items || []).map((it: any) => {
      let meta: any = {};
      try {
        meta = JSON.parse(it.description || "{}");
      } catch {}
      return {
        product: meta.productId,
        color: meta.color || "N/A",
        size: meta.size || "N/A",
        quantity: Number(it.quantity || 1),
      };
    });

    let shippingRate = "FREE_DELIVERY";
    try {
      const c = JSON.parse(purchaseUnit?.customId || (purchaseUnit as any)?.custom_id || "{}");
      if (typeof c?.shippingRate === "string") shippingRate = c.shippingRate;
    } catch {}

    const totalAmount = Number(purchaseUnit?.amount?.value ?? 0);
    const paypalOrderId = String(ppOrder.id || orderId);

    const captureStatuses: string[] = [];
    const collectCaptureStatuses = (units: any) => {
      if (!Array.isArray(units)) return;
      for (const unit of units) {
        if (!unit) continue;
        const paymentsAny = (unit as any)?.payments || (unit as any)?.payments;
        const candidateLists = [
          paymentsAny?.captures,
          (paymentsAny as any)?.captures,
        ];
        for (const candidate of candidateLists) {
          if (!Array.isArray(candidate)) continue;
          for (const capture of candidate) {
            const statusValue = capture?.status;
            if (statusValue) captureStatuses.push(String(statusValue));
          }
        }
      }
    };
    collectCaptureStatuses((capturePayload as any)?.purchaseUnits);
    collectCaptureStatuses((capturePayload as any)?.purchase_units);
    collectCaptureStatuses(ppOrder.purchaseUnits);

    const captureStatusHint = String((capturePayload as any)?.status || "");
    if (captureStatusHint) captureStatuses.push(captureStatusHint);

    const hasCompletedCapture =
      captureOK ||
      status === "COMPLETED" ||
      captureStatuses.some((value) => String(value || "").toUpperCase() === "COMPLETED");

    const orderStatus = hasCompletedCapture ? "COMPLETED" : status || "CREATED";

    // 4) Persist order (idempotent)
    await connectToDB();

    const savedOrder = await Order.findOneAndUpdate(
      { paypalOrderId },
      {
        $set: {
          paypalOrderId,
          status: orderStatus,
          customerClerkId: clerkId,
          products: orderItems,
          shippingAddress,
          shippingRate,
          totalAmount,
        },
        $setOnInsert: { createdAt: new Date(), fulfillmentStatus: "PENDING" },
      },
      { upsert: true, new: true }
    ).catch(async (e: any) => {
      if (e?.code === 11000) {
        return Order.findOne({ paypalOrderId });
      }
      throw e;
    });

    // Decrement product stock for each purchased item
    try {
      for (const item of orderItems) {
        const productId = item.product;
        const qty = Number(item.quantity || 0);
        const color = item.color && item.color !== "N/A" ? String(item.color) : undefined;
        const size = item.size && item.size !== "N/A" ? String(item.size) : undefined;
        if (!productId || !qty || qty <= 0) continue;

        // Try to decrement variant stock if color/size provided
        let matched = 0;
        if (color || size) {
          const match: any = { _id: productId, variants: { $elemMatch: {} } };
          if (color) match.variants.$elemMatch.color = color;
          if (size) match.variants.$elemMatch.size = size;
          const wr = await Product.updateOne(match, {
            $inc: { 'variants.$.stock': -qty, countInStock: -qty },
          });
          matched = wr.matchedCount || wr.modifiedCount || 0;
          // Clamp negative variant stock
          await Product.updateOne(
            { _id: productId },
            { $set: { 'variants.$[v].stock': 0 } },
            { arrayFilters: [{ 'v.stock': { $lt: 0 } }] } as any
          ).catch(() => {});
        }
        if (!matched) {
          // Fallback: decrement global stock
          await Product.updateOne(
            { _id: productId },
            { $inc: { countInStock: -qty } }
          );
        }
        const p = await Product.findById(productId).select("countInStock variants");
        if (p && typeof (p as any).countInStock === "number" && (p as any).countInStock < 0) {
          await Product.updateOne({ _id: productId }, { $set: { countInStock: 0 } });
        }
        // Emit stock update event
        try {
          const latest = await Product.findById(productId).select("countInStock variants").lean();
          if (latest) {
            emitter.emit("product", {
              kind: "stock",
              productId: String(productId),
              countInStock: (latest as any).countInStock,
              variants: Array.isArray((latest as any).variants) ? (latest as any).variants : undefined,
            });
          }
        } catch {}
      }
    } catch (stockErr) {
      console.warn("[paypal_capture] Failed to decrement stock", stockErr);
    }

    // 5) Upsert customer + link order
    // Prefer clerkId; if missing, fall back to payer email.
    const dbName = mongoose.connection?.name;
    console.log("[capture] DB:", dbName);

    const rawClerkId = typeof clerkId === "string" ? clerkId.trim() : "";
    let emailLc = String(payer?.emailAddress || payer?.email_address || "").toLowerCase();
    let nameFull = [
      payer?.name?.givenName || payer?.name?.given_name,
      payer?.name?.surname,
    ]
      .filter(Boolean)
      .join(" ");

    // If PayPal doesn't provide name/email but we have a Clerk ID, enrich from Clerk
    if (rawClerkId && (!nameFull || !emailLc)) {
      try {
        const secret = process.env.CLERK_SECRET_KEY;
        if (secret) {
          const res = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(rawClerkId)}` as any, {
            headers: { Authorization: `Bearer ${secret}` },
            cache: "no-store",
          } as any);
          if (res.ok) {
            const u: any = await res.json();
            const n = [u?.first_name, u?.last_name].filter(Boolean).join(" ");
            const primaryEmailId = u?.primary_email_address_id;
            const e = (u?.email_addresses || []).find((x: any) => x.id === primaryEmailId)?.email_address || u?.email_addresses?.[0]?.email_address || "";
            if (!nameFull && n) nameFull = n;
            if (!emailLc && e) emailLc = String(e).toLowerCase();
          }
        }
      } catch {}
    }

    const filter =
      rawClerkId ? { clerkId: rawClerkId } :
      emailLc    ? { email: emailLc } :
      null;

    console.log("[capture] customer filter:", filter);

    if (filter) {
      const update: any = {
        $setOnInsert: {
          ...(rawClerkId && { clerkId: rawClerkId }),
          orders: [], // seed so $addToSet always works
        },
        $addToSet: { orders: savedOrder._id },
        $set: {
          ...(nameFull && { name: nameFull }),
          ...(emailLc && { email: emailLc }),
        },
      };

      try {
        const wr = await Customer.updateOne(filter, update, {
          upsert: true,
          setDefaultsOnInsert: true,
          runValidators: false,
        });
        console.log("[capture] customer write:", {
          matched: wr.matchedCount,
          modified: wr.modifiedCount,
          upsertedId: wr.upsertedId?.toString?.() || wr.upsertedId,
        });

        const verify = await Customer.findOne(filter).select("_id clerkId email orders").lean();
        console.log("[capture] customer verify:", verify);
      } catch (e: any) {
        console.error("[capture] customer upsert ERROR", { code: e?.code, message: e?.message });
      }
    } else {
      console.warn("[capture] NO clerkId or email from PayPal order.", { clerkId: rawClerkId, email: emailLc });
    }

    return NextResponse.json(
      {
        ok: true,
        status,
        paypalOrderId,
        mongoOrderId: String(savedOrder._id),
      },
      { headers: corsFor(req) }
    );
  } catch (err: any) {
    console.error("[paypal_capture_POST] unhandled:", jsonify(err));
    return new NextResponse(
      JSON.stringify({ error: "UNHANDLED", detail: jsonify(err) }),
      { status: 500, headers: corsFor(req) }
    );
  }
}
