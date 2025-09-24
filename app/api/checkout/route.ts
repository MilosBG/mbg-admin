import { NextRequest, NextResponse } from "next/server";
import {
  CheckoutPaymentIntent,
  OrderApplicationContextLandingPage,
  OrderApplicationContextShippingPreference,
  OrderApplicationContextUserAction,
  type Item,
  type Money,
  type OrderRequest,
} from "@paypal/paypal-server-sdk";
import { payPalOrders } from "@/lib/paypal";

type CartItem = {
  item?: {
    _id?: unknown;
    title?: unknown;
    price?: unknown;
  };
  quantity?: unknown;
  size?: unknown;
  color?: unknown;
};

type CheckoutRequestBody = {
  cartItems?: unknown;
  customer?: { clerkId?: unknown };
  shippingOption?: unknown;
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

const toMoneyString = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

const asNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const asQuantity = (value: unknown): number => {
  const parsed = Math.trunc(asNumber(value, 1));
  return parsed > 0 ? parsed : 1;
};

const toMoneyValue = (amount: number): Money => ({
  currencyCode: "EUR",
  value: toMoneyString(amount),
});

const toPayPalItems = (cartItems: CartItem[]): Item[] =>
  cartItems.map((ci) => {
    const price = asNumber(ci.item?.price, 0);
    const quantity = asQuantity(ci.quantity);
    const rawId = ci.item?._id;
    const sku = rawId !== undefined ? String(rawId) : "";
    const meta: Record<string, unknown> = {};
    if (sku) meta.productId = sku;
    if (ci.size) meta.size = ci.size;
    if (ci.color) meta.color = ci.color;

    return {
      name: String(ci.item?.title ?? "Item"),
      unitAmount: toMoneyValue(price),
      quantity: String(quantity),
      ...(sku ? { sku } : {}),
      ...(Object.keys(meta).length ? { description: JSON.stringify(meta) } : {}),
    };
  });

const isCartItem = (value: unknown): value is CartItem => {
  if (!value || typeof value !== "object") return false;
  return "item" in value && typeof (value as CartItem).item === "object";
};

export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, { headers: getCors(req) });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CheckoutRequestBody | null;
    const rawItems = Array.isArray(body?.cartItems) ? body?.cartItems : [];
    const cartItems = rawItems.filter(isCartItem);
    const clerkId = body?.customer?.clerkId;

    if (!cartItems.length || typeof clerkId !== "string" || !clerkId) {
      return new NextResponse("Not Enough Data To Checkout", { status: 400 });
    }

    const items = toPayPalItems(cartItems);

    const itemSubTotal = cartItems.reduce((sum, ci) => {
      const price = asNumber(ci.item?.price, 0);
      const quantity = asQuantity(ci.quantity);
      return sum + price * quantity;
    }, 0);

    const normalizedShip = String(body?.shippingOption || "").toUpperCase() === "EXPRESS" ? "EXPRESS" : "FREE";
    const shippingMap = {
      FREE: { id: "FREE_DELIVERY", label: "FREE DELIVERY", amount: 0 },
      EXPRESS: { id: "EXPRESS_DELIVERY", label: "EXPRESS DELIVERY", amount: 20 },
    } as const;

    const chosen = shippingMap[normalizedShip];
    const amountValue = itemSubTotal + chosen.amount;

    const orderRequest: OrderRequest = {
      intent: CheckoutPaymentIntent.Capture,
      purchaseUnits: [
        {
          referenceId: clerkId,
          customId: JSON.stringify({ shippingRate: chosen.id }),
          amount: {
            currencyCode: "EUR",
            value: toMoneyString(amountValue),
            breakdown: {
              itemTotal: toMoneyValue(itemSubTotal),
              shipping: toMoneyValue(chosen.amount),
            },
          },
          ...(items.length ? { items } : {}),
        },
      ],
      applicationContext: {
        brandName: "Milos BG",
        landingPage: OrderApplicationContextLandingPage.NoPreference,
        userAction: OrderApplicationContextUserAction.PayNow,
        shippingPreference: OrderApplicationContextShippingPreference.GetFromFile,
        returnUrl: `${process.env.ECOMMERCE_STORE_URL}/payment_success`,
        cancelUrl: `${process.env.ECOMMERCE_STORE_URL}/the-hoop`,
      },
    };

    const { result: order } = await payPalOrders.createOrder({
      body: orderRequest,
      prefer: "return=representation",
    });

    const approve = order.links?.find((link) => link.rel === "approve")?.href;
    if (!approve) {
      return new NextResponse("No approve link from PayPal", { status: 502 });
    }

    return NextResponse.json(
      { id: order.id, approveUrl: approve },
      { headers: getCors(req) },
    );
  } catch (err) {
    console.log("[paypal_checkout_POST]", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
