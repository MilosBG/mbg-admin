import { NextRequest, NextResponse } from "next/server";
import { getStorefrontServiceToken, isValidStorefrontToken } from "@/lib/serviceTokens";
import {
  CheckoutError,
  type CheckoutRequestBody,
  startStorefrontCheckout,
} from "@/lib/storefrontCheckout";

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
  if (!match) return null;
  return match[1].trim();
}

export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, { headers: getCors(req) });
}

export async function POST(req: NextRequest) {
  const headers = getCors(req);
  const expectedToken = getStorefrontServiceToken();
  if (!expectedToken) {
    return NextResponse.json({ error: "SERVICE_TOKEN_NOT_CONFIGURED" }, { status: 500, headers });
  }

  let providedToken = extractBearerToken(req);
  if (!providedToken) {
    const alt = req.headers.get("x-storefront-service-token");
    if (alt) providedToken = alt.trim();
  }

  if (!isValidStorefrontToken(providedToken)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401, headers });
  }

  let body: CheckoutRequestBody;
  try {
    body = (await req.json()) as CheckoutRequestBody;
  } catch {
    return NextResponse.json(
      { error: "INVALID_JSON" },
      { status: 400, headers },
    );
  }

  try {
    console.log("[storefront checkout] payload received", {
      clerkId: body?.customer?.clerkId ?? null,
      lines: Array.isArray(body?.cartItems) ? body.cartItems.length : 0,
    });
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

    console.log("[storefront_checkout_POST]", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR" },
      { status: 500, headers },
    );
  }
}

