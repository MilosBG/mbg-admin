import { NextRequest, NextResponse } from "next/server";
import { CheckoutError, type CheckoutRequestBody, startStorefrontCheckout } from "@/lib/storefrontCheckout";
import { getStorefrontServiceToken } from "@/lib/serviceTokens";

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

function extractServiceToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  if (match) return match[1].trim();
  const alt = req.headers.get("x-storefront-service-token");
  return alt ? alt.trim() : null;
}

export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, { headers: getCors(req) });
}

export async function POST(req: NextRequest) {
  const headers = getCors(req);
  const expectedToken = getStorefrontServiceToken();
  const providedToken = extractServiceToken(req);

  if (providedToken) {
    if (!expectedToken || providedToken !== expectedToken) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401, headers });
    }
  }

  try {
    const body = (await req.json()) as CheckoutRequestBody | null;
    if (!body) {
      return NextResponse.json({ error: "MISSING_BODY" }, { status: 400, headers });
    }

    const result = await startStorefrontCheckout(body);
    const payload = {
      approveUrl: result.approveUrl,
      orderId: result.orderId,
      reference: result.reference ?? null,
      currency: result.currency,
      total: result.total,
      itemTotal: result.itemTotal,
      shippingAmount: result.shippingAmount,
      shippingRate: result.shippingRate,
      message: result.message ?? null,
    };

    return NextResponse.json(payload, { status: 200, headers });
  } catch (err) {
    if (err instanceof CheckoutError) {
      return NextResponse.json(
        {
          error: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
        { status: err.status, headers },
      );
    }

    console.log("[checkout_POST]", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500, headers });
  }
}

