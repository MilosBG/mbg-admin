import Order from "@/lib/models/Order";
import Product from "@/lib/models/Product";
import { connectToDB } from "@/lib/mongoDB";
import { getStorefrontServiceToken, isValidStorefrontToken } from "@/lib/serviceTokens";
import { NextRequest, NextResponse } from "next/server";

function getCors(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  const allowed = [String(process.env.ECOMMERCE_STORE_URL || "")].filter(Boolean);
  const allowAll = process.env.NODE_ENV !== "production";
  const ok = allowAll || allowed.includes(origin);
  return {
    "Access-Control-Allow-Origin": ok ? (allowAll ? "*" : origin) : "",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}

function extractBearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (match) return match[1].trim();
  const alt = req.headers.get("x-storefront-service-token");
  return alt ? alt.trim() : null;
}

export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, { headers: getCors(req) });
}

export const GET = async (
  req: NextRequest,
  ctx: { params: Promise<{ customerId: string }> }
) => {
  const headers = getCors(req);

  const expectedToken = getStorefrontServiceToken();
  const providedToken = extractBearerToken(req);

  if (providedToken) {
    if (!isValidStorefrontToken(providedToken)) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401, headers });
    }
  } else if (expectedToken) {
    const hasCookie = Boolean(req.headers.get("cookie"));
    if (!hasCookie) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401, headers });
    }
  }

  try {
    await connectToDB();

    const { customerId } = await ctx.params;

    const orders = await Order.find({
      customerClerkId: customerId,
    })
      .populate({ path: "products.product", model: Product })
      .lean();

    return NextResponse.json(orders ?? [], { status: 200, headers });
  } catch (err) {
    console.log("[orders_customers_GET]", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500, headers });
  }
};

export const dynamic = "force-dynamic";
