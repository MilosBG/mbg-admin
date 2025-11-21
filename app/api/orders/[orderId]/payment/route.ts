import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import mongoose from "mongoose";

import { connectToDB } from "@/lib/mongoDB";
import Order from "@/lib/models/Order";

const ALLOWED = ["PENDING", "PAID", "NOT PAID"] as const;
type PaymentStatus = (typeof ALLOWED)[number];

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
    const raw = String(body?.status || "").toUpperCase();
    if (!ALLOWED.includes(raw as PaymentStatus)) {
      return new NextResponse("Invalid status", { status: 400 });
    }

    await connectToDB();
    const order = await Order.findById(orderId).select("status");
    if (!order) return new NextResponse("Not Found", { status: 404 });

    const nextStatus = raw as PaymentStatus;
    order.status = nextStatus;
    await order.save();

    return NextResponse.json({ ok: true, status: nextStatus }, { status: 200 });
  } catch (err) {
    console.log("[order_payment_PATCH]", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
};

export const dynamic = "force-dynamic";
