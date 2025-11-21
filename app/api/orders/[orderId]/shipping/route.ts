/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoDB";
import Order from "@/lib/models/Order";

export const PATCH = async (
  req: NextRequest,
  ctx: { params: Promise<{ orderId: string }> }
) => {
  try {
    await connectToDB();
    const { orderId } = await ctx.params;
    const body = await req.json();

    const update: any = {};
    if (typeof body?.shippingMethod === "string") {
      const v = String(body.shippingMethod).toUpperCase();
      if (["FREE", "EXPRESS"].includes(v)) update.shippingMethod = v;
    }
    if (typeof body?.trackingNumber === "string") update.trackingNumber = body.trackingNumber.trim();
    if (typeof body?.transporter === "string") {
      const carrier = body.transporter.trim();
      update.transporter = carrier || null;
    }
    if (body?.dateMailed) {
      const d = new Date(body.dateMailed);
      if (!Number.isNaN(d.getTime())) update.dateMailed = d;
    }

    if (Object.keys(update).length === 0) {
      return new NextResponse("No valid fields", { status: 400 });
    }

    const res = await Order.updateOne({ _id: orderId }, { $set: update });
    if (!res.matchedCount) return new NextResponse("Not Found", { status: 404 });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.log("[order_shipping_PATCH]", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
};

export const dynamic = "force-dynamic";

