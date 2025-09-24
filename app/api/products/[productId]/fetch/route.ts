/* eslint-disable @typescript-eslint/no-explicit-any */
import Product from "@/lib/models/Product";
import { connectToDB } from "@/lib/mongoDB";
import { auth } from "@clerk/nextjs/server";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ productId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { productId } = await ctx.params;
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return new NextResponse(JSON.stringify({ message: "Invalid product id" }), { status: 400 });
    }

    const body = await req.json().catch(() => ({}));

    await connectToDB();

    // Ensure we read current state to support toggle or explicit set
    const current = await Product.findById(productId).lean();
    if (!current) {
      return new NextResponse(JSON.stringify({ message: "Product not found" }), { status: 404 });
    }

    let desired: boolean | undefined = undefined;
    const raw = (body as any)?.fetch;
    if (typeof raw === "boolean") desired = raw;
    else if (typeof raw === "string") {
      const s = raw.trim().toLowerCase();
      if (["true", "1", "yes", "on"].includes(s)) desired = true;
      if (["false", "0", "no", "off"].includes(s)) desired = false;
    }
    else if (typeof raw === "number") desired = raw !== 0;

    const nextVal = typeof desired === "boolean" ? desired : !Boolean((current as any)?.fetchToStore);

    const updated = await Product.findByIdAndUpdate(
      productId,
      { $set: { fetchToStore: nextVal } },
      { new: true },
    );

    if (!updated) {
      return new NextResponse(JSON.stringify({ message: "Product not found" }), { status: 404 });
    }

    const shouldFetch = Boolean(updated.fetchToStore);

    // Optional: notify the ecommerce store to refresh/sync
    // If the external endpoint is not available, ignore failures.
    try {
      const base = process.env.ECOMMERCE_STORE_URL || "";
      const endpoint = `${base}/api/admin/sync-product`;
      if (base) {
        await fetch(endpoint as any, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, fetch: shouldFetch, source: process.env.ECOMMERCE_ADMIN_URL || "" }),
          cache: "no-store",
        } as any).catch(() => {});
      }
    } catch {}

    return NextResponse.json({ ok: true, fetchToStore: updated.fetchToStore }, { status: 200 });
  } catch (err) {
    console.log("[productId/fetch_POST]", err);
    return new NextResponse("Internal error", { status: 500 });
  }
}
