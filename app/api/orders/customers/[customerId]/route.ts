import Order from "@/lib/models/Order";
import Product from "@/lib/models/Product";
import { connectToDB } from "@/lib/mongoDB";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (
  req: NextRequest,
  ctx: { params: Promise<{ customerId: string }> }
) => {
  try {
    await connectToDB();

    const { customerId } = await ctx.params;

    const orders = await Order.find({
      customerClerkId: customerId,
    }).populate({ path: "products.product", model: Product });

    return NextResponse.json(orders, { status: 200 });
  } catch (err) {
    console.log("[customerId_GET", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
};

export const dynamic = "force-dynamic";
