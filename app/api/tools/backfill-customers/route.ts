/* eslint-disable @typescript-eslint/no-unused-vars */
// app/api/tools/backfill-customers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoDB";
import Order from "@/lib/models/Order";
import Customer from "@/lib/models/Customer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  await connectToDB();
  const orders = await Order.find({}).select("_id customerClerkId").lean();
  const map = new Map<string,string[]>();
  for (const o of orders) {
    const id = (o.customerClerkId || "").trim();
    if (!id) continue;
    map.set(id, [...(map.get(id) || []), String(o._id)]);
  }
  let created = 0, linked = 0;
  for (const [clerkId, orderIds] of map.entries()) {
    const wr = await Customer.updateOne(
      { clerkId },
      { $setOnInsert: { name: "", email: "" }, $addToSet: { orders: { $each: orderIds } } },
      { upsert: true, setDefaultsOnInsert: true }
    );
    if (wr.upsertedId) created++;
    linked += orderIds.length;
  }
  return NextResponse.json({ ok: true, created, linked, unique: map.size });
}
