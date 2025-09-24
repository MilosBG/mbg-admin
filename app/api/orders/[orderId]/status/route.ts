/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDB } from "@/lib/mongoDB";
import Order from "@/lib/models/Order";
import mongoose from "mongoose";

const ALLOWED = ["PENDING","PROCESSING","SHIPPED","DELIVERED","COMPLETED","CANCELLED"] as const;
type Fulfillment = typeof ALLOWED[number];

function canTransition(from: Fulfillment, to: Fulfillment) {
  if (from === to) return true;
  const map: Record<Fulfillment, Fulfillment[]> = {
    PENDING: ["PROCESSING", "CANCELLED"],
    PROCESSING: ["SHIPPED", "CANCELLED"],
    SHIPPED: ["DELIVERED", "CANCELLED"],
    DELIVERED: ["COMPLETED"],
    COMPLETED: [],
    CANCELLED: [],
  };
  return map[from]?.includes(to) ?? false;
}

export const PATCH = async (
  req: NextRequest,
  ctx: { params: Promise<{ orderId: string }> }
) => {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { orderId } = await ctx.params;
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return new NextResponse("Invalid order id", { status: 400 });
    }

    const body = await req.json();
    const raw: string = String(body?.status || "").toUpperCase();
    if (!ALLOWED.includes(raw as Fulfillment)) {
      return new NextResponse("Invalid status", { status: 400 });
    }
    const to = raw as Fulfillment;

    await connectToDB();
    const order = await Order.findById(orderId);
    if (!order) return new NextResponse("Not Found", { status: 404 });

    const from = (order.fulfillmentStatus || "PENDING") as Fulfillment;
    if (!canTransition(from, to)) {
      return new NextResponse(`Illegal transition ${from} -> ${to}`, { status: 409 });
    }

    order.fulfillmentStatus = to;
    const now = new Date();
    if (to === "PROCESSING" && !order.processingAt) order.processingAt = now as any;
    if (to === "SHIPPED" && !order.shippedAt) order.shippedAt = now as any;
    if (to === "DELIVERED" && !order.deliveredAt) order.deliveredAt = now as any;
    if (to === "COMPLETED" && !order.completedAt) order.completedAt = now as any;
    if (to === "CANCELLED" && !order.cancelledAt) order.cancelledAt = now as any;
    await order.save();
    return NextResponse.json({ ok: true, fulfillmentStatus: to }, { status: 200 });
  } catch (err) {
    console.log("[order_status_PATCH]", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
};

export const dynamic = "force-dynamic";
