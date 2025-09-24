import { NextRequest, NextResponse } from "next/server";
import emitter from "@/lib/events";
import { connectToDB } from "@/lib/mongoDB";
import Order from "@/lib/models/Order";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest) {
  const expected = String(process.env.PRINT_WEBHOOK_SECRET || "");
  if (!expected) return true; // if not set, allow
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
  const header = req.headers.get("x-print-secret") || "";
  return bearer === expected || header === expected;
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) return new NextResponse("Unauthorized", { status: 401 });
    const body = await req.json().catch(() => ({}));
    const orderId = String(body?.orderId || "");
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return new NextResponse("Invalid orderId", { status: 400 });
    }

    await connectToDB();
    const order = await Order.findById(orderId).select("_id fulfillmentStatus").lean();
    if (!order) return new NextResponse("Not found", { status: 404 });

    // Broadcast to any connected AutoPrinter clients
    emitter.emit("order", { orderId: String(order._id), status: String(order.fulfillmentStatus || "PENDING") });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[print/notify]", e);
    return new NextResponse("Internal error", { status: 500 });
  }
}

