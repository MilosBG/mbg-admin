/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoDB";
import Order from "@/lib/models/Order";
import Customer from "@/lib/models/Customer";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS });
}

export async function POST(_req: NextRequest) {
  try {
    await connectToDB();
    const secret = process.env.CLERK_SECRET_KEY;

    // 1) Build/Link customers from orders
    const orders = await Order.find({
      customerClerkId: { $exists: true, $ne: "" },
    })
      .select("_id customerClerkId")
      .lean();
    const map = new Map<string, string[]>();
    for (const o of orders) {
      const id = String(o.customerClerkId || "").trim();
      if (!id) continue;
      map.set(id, [...(map.get(id) || []), String(o._id)]);
    }

    let created = 0,
      linked = 0,
      enriched = 0;
    for (const [clerkId, orderIds] of map.entries()) {
      const existing = await Customer.findOne({ clerkId })
        .select("name email")
        .lean();

      let name = existing?.name || "";
      let email = existing?.email || "";
      if ((!name || !email) && secret) {
        try {
          const res = await fetch(
            `https://api.clerk.com/v1/users/${encodeURIComponent(clerkId)}` as any,
            {
              headers: { Authorization: `Bearer ${secret}` },
              cache: "no-store",
            } as any,
          );
          if (res.ok) {
            const u: any = await res.json();
            const n = [u?.first_name, u?.last_name].filter(Boolean).join(" ");
            const primaryEmailId = u?.primary_email_address_id;
            const e =
              (u?.email_addresses || []).find(
                (x: any) => x.id === primaryEmailId,
              )?.email_address ||
              u?.email_addresses?.[0]?.email_address ||
              "";
            if (!name && n) name = n;
            if (!email && e) email = String(e).toLowerCase();
          }
        } catch {}
      }

      const update: any = {
        $setOnInsert: { clerkId },
        $set: { ...(name && { name }), ...(email && { email }) },
      };
      if (orderIds.length) update.$addToSet = { orders: { $each: orderIds } };

      const wr = await Customer.updateOne({ clerkId }, update, {
        upsert: true,
        setDefaultsOnInsert: true,
      });
      if (wr.upsertedId) created++;
      linked += orderIds.length;
      if (name || email) enriched++;
    }

    return NextResponse.json(
      { ok: true, created, linked, enriched, unique: map.size },
      { headers: CORS },
    );
  } catch (e) {
    console.error("[tools/repair-customers]", e);
    return new NextResponse("Failed", { status: 500, headers: CORS });
  }
}
