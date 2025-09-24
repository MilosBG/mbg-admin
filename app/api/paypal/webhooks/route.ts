/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { payPalClient } from "@/lib/paypal";
import { connectToDB } from "@/lib/mongoDB";
import Order from "@/lib/models/Order";
import Product from "@/lib/models/Product";
import Customer from "@/lib/models/Customer";
import emitter from "@/lib/events";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    const transmissionId = req.headers.get("paypal-transmission-id")!;
    const timestamp = req.headers.get("paypal-transmission-time")!;
    const webhookId = process.env.PAYPAL_WEBHOOK_ID!;
    const certUrl = req.headers.get("paypal-cert-url")!;
    const authAlgo = req.headers.get("paypal-auth-algo")!;
    const transmissionSig = req.headers.get("paypal-transmission-sig")!;

    const { default: paypal } = await import("@paypal/checkout-server-sdk");
    // @ts-ignore
    const verifyReq = new paypal.webhooks.VerifyWebhookSignatureRequest();
    verifyReq.requestBody({
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: timestamp,
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody),
    });

    const verifyRes = await payPalClient.execute(verifyReq);
    if (verifyRes.result.verification_status !== "SUCCESS") {
      return new NextResponse("Invalid webhook", { status: 400 });
    }

    const event = JSON.parse(rawBody);

    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const orderId =
        event.resource?.supplementary_data?.related_ids?.order_id ||
        event.resource?.id;

      // Get the full order
      // @ts-ignore
      const getReq = new paypal.orders.OrdersGetRequest(orderId);
      const orderRes = await payPalClient.execute(getReq);
      const pu = orderRes.result.purchase_units?.[0];
      const payer = orderRes.result.payer;

      const customerInfo = {
        clerkId: pu?.reference_id || "",
        name: [payer?.name?.given_name, payer?.name?.surname].filter(Boolean).join(" "),
        email: payer?.email_address || "",
      };

      const shippingAddress = {
        street: pu?.shipping?.address?.address_line_1 || "",
        city: pu?.shipping?.address?.admin_area_2 || "",
        state: pu?.shipping?.address?.admin_area_1 || "",
        postalCode: pu?.shipping?.address?.postal_code || "",
        country: pu?.shipping?.address?.country_code || "",
      };

      const orderItems = (pu?.items || []).map((it: any) => {
        let meta: any = {};
        try { meta = JSON.parse(it.description || "{}"); } catch {}
        return {
          product: meta.productId,
          color: meta.color || "N/A",
          size: meta.size || "N/A",
          quantity: Number(it.quantity || 1),
        };
      });

      const shippingRate = (() => {
        try {
          const c = JSON.parse(pu?.custom_id || "{}");
          return c.shippingRate || "FREE_DELIVERY";
        } catch { return "FREE_DELIVERY"; }
      })();

      const totalAmount = Number(pu?.amount?.value || 0);

      await connectToDB();
      const newOrder = new Order({
        customerClerkId: customerInfo.clerkId,
        products: orderItems,
        shippingAddress,
        shippingRate,
        totalAmount,
        fulfillmentStatus: "PENDING",
      });
      await newOrder.save();

      // Decrement product stock based on purchased quantities (variant-aware)
      try {
        for (const item of orderItems) {
          const productId = item.product;
          const qty = Number(item.quantity || 0);
          const color = item.color && item.color !== "N/A" ? String(item.color) : undefined;
          const size = item.size && item.size !== "N/A" ? String(item.size) : undefined;
          if (!productId || !qty || qty <= 0) continue;
          let matched = 0;
          if (color || size) {
            const match: any = { _id: productId, variants: { $elemMatch: {} } };
            if (color) match.variants.$elemMatch.color = color;
            if (size) match.variants.$elemMatch.size = size;
            const wr = await Product.updateOne(match, {
              $inc: { 'variants.$.stock': -qty, countInStock: -qty },
            });
            matched = wr.matchedCount || wr.modifiedCount || 0;
            await Product.updateOne(
              { _id: productId },
              { $set: { 'variants.$[v].stock': 0 } },
              { arrayFilters: [{ 'v.stock': { $lt: 0 } }] } as any
            ).catch(() => {});
          }
          if (!matched) {
            await Product.updateOne(
              { _id: productId },
              { $inc: { countInStock: -qty } }
            );
          }
          const p = await Product.findById(productId).select("countInStock variants");
          if (p && typeof p.countInStock === "number" && p.countInStock < 0) {
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
        console.warn("[paypal_webhook] Failed to decrement stock", stockErr);
      }

      // Upsert customer (handle missing clerkId by falling back to email)
      const rawClerkId = String(customerInfo.clerkId || "").trim();
      let emailLc = String(customerInfo.email || "").toLowerCase();
      let nameFull = String(customerInfo.name || "");

      // If PayPal lacks name/email but we have clerkId, enrich from Clerk
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

      const filter = rawClerkId
        ? { clerkId: rawClerkId }
        : emailLc
        ? { email: emailLc }
        : null;

      if (filter) {
        const update: any = {
          $setOnInsert: {
            ...(rawClerkId && { clerkId: rawClerkId }),
            orders: [],
          },
          $addToSet: { orders: newOrder._id },
          $set: {
            ...(nameFull && { name: nameFull }),
            ...(emailLc && { email: emailLc }),
          },
        };

        await Customer.updateOne(filter, update, {
          upsert: true,
          setDefaultsOnInsert: true,
          runValidators: false,
        });
      } else {
        console.warn("[paypal_webhook] missing clerkId and email; skip customer upsert");
      }
    }

    return new NextResponse("OK", { status: 200 });
  } catch (err) {
    console.log("[paypal_webhook_POST]", err);
    return new NextResponse("Failed To Handle Webhook", { status: 500 });
  }
}
