export const dynamic = "force-dynamic"; // ?? MUST be first

import Product from "@/lib/models/Product";
import { connectToDB } from "@/lib/mongoDB";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: Promise<{ query: string }> };

type ProductFilter = Record<string, unknown>;

const createRegex = (value: string) => new RegExp(value, "i");

export const GET = async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    await connectToDB();

    const { query } = await ctx.params;
    const decodedQuery = decodeURIComponent(query || "");
    // Escape regex special chars to prevent ReDoS and unintended patterns
    const escaped = decodedQuery.replace(/[.*+?^${}()|\[\]\\]/g, "\\$&");
    console.log("?? Decoded query:", decodedQuery);

    const availableOnly = req.nextUrl.searchParams.get("availableOnly");
    const baseFilter: ProductFilter = {
      $or: [
        { title: { $regex: escaped, $options: "i" } },
        { category: { $regex: escaped, $options: "i" } },
        { tags: { $in: [createRegex(escaped)] } },
      ],
    };
    if (String(availableOnly).toLowerCase() === "true") {
      baseFilter.countInStock = { $gt: 0 };
    }

    const searchProducts = await Product.find(baseFilter);

    console.log("?? Search result:", searchProducts);

    return NextResponse.json(searchProducts, { status: 200 });
  } catch (err) {
    console.error("[search_GET]", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
};
