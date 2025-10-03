import Customer from "@/lib/models/Customer";
import Order from "@/lib/models/Order";
import Product from "@/lib/models/Product";
import { connectToDB } from "@/lib/mongoDB";
import { getStorefrontServiceToken, isValidStorefrontToken } from "@/lib/serviceTokens";
import { NextRequest, NextResponse } from "next/server";

type LeanOrder = {
  _id: unknown;
  customerClerkId?: string | null;
  shippingAddress?: {
    street?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
  } | null;
  shippingRate?: string | null;
  shippingMethod?: string | null;
  trackingNumber?: string | null;
  weightGrams?: number | null;
  totalAmount?: number | null;
  createdAt?: Date | string | null;
  dateMailed?: Date | string | null;
  products?: unknown;
};
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
  ctx: { params: Promise<{ orderId: string }> }
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
    const { orderId } = await ctx.params;

    const orderDetails = await Order.findById(orderId)
      .populate({ path: "products.product", model: Product })
      .lean<LeanOrder | null>();

    if (!orderDetails) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404, headers });
    }

    const customer = orderDetails.customerClerkId
      ? await Customer.findOne({ clerkId: orderDetails.customerClerkId }).lean()
      : null;

    return NextResponse.json({ orderDetails, customer }, { status: 200, headers });
  } catch (err) {
    console.log("[orderId_GET]", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500, headers });
  }
};
