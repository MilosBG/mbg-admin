import Stripe from "stripe";
import { stripe } from "@/lib/stripe";

export type LegacyCartLine = {
  item?: {
    _id?: unknown;
    title?: unknown;
    price?: unknown;
  };
  quantity?: unknown;
  size?: unknown;
  color?: unknown;
};

export type LightweightCartLine = {
  productId?: unknown;
  id?: unknown;
  unitPrice?: unknown;
  price?: unknown;
  title?: unknown;
  quantity?: unknown;
  size?: unknown;
  color?: unknown;
};

export type NormalizedCartItem = {
  productId?: string;
  title: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
};

export type CheckoutRequestBody = {
  cartItems?: unknown;
  items?: unknown;
  lines?: unknown;
  customer?: { clerkId?: unknown };
  shippingOption?: unknown;
};

export class CheckoutError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "CheckoutError";
    this.status = status;
    this.details = details;
  }
}

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

const MAX_ITEM_FIELD_LENGTH = 127;

const truncateField = (value: string) =>
  value.length > MAX_ITEM_FIELD_LENGTH
    ? value.slice(0, MAX_ITEM_FIELD_LENGTH)
    : value;

const normalizeCartItem = (value: unknown): NormalizedCartItem | null => {
  if (!value || typeof value !== "object") return null;

  const entry = value as LegacyCartLine & LightweightCartLine;
  const quantity = asQuantity(entry.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) return null;

  const size =
    typeof entry.size === "string" && entry.size.trim().length
      ? entry.size.trim()
      : undefined;
  const color =
    typeof entry.color === "string" && entry.color.trim().length
      ? entry.color.trim()
      : undefined;

  let productId = "";
  let titleSource: unknown = "";
  let price = 0;

  if (entry.item && typeof entry.item === "object") {
    const legacy = entry.item as Record<string, unknown>;
    if (legacy._id !== undefined && legacy._id !== null) {
      productId = String(legacy._id);
    } else if (entry.productId !== undefined && entry.productId !== null) {
      productId = String(entry.productId);
    }

    titleSource =
      typeof legacy.title === "string" && legacy.title.trim()
        ? legacy.title
        : (entry.title ?? "");

    price = asNumber(legacy.price, asNumber(entry.unitPrice ?? entry.price, 0));
  } else {
    if (entry.productId !== undefined && entry.productId !== null) {
      productId = String(entry.productId);
    } else if (entry.id !== undefined && entry.id !== null) {
      productId = String(entry.id);
    }

    titleSource = entry.title ?? "";
    price = asNumber(entry.unitPrice ?? entry.price, 0);
  }

  const normalizedTitle = (() => {
    if (typeof titleSource === "string" && titleSource.trim())
      return truncateField(titleSource.trim());
    const fallback = String(titleSource ?? "").trim();
    return truncateField(fallback || "Article");
  })();

  return {
    ...(productId ? { productId } : {}),
    title: normalizedTitle,
    price: Math.max(0, price),
    quantity,
    ...(size ? { size } : {}),
    ...(color ? { color } : {}),
  };
};

const getNormalizedCartItems = (
  body: CheckoutRequestBody,
): NormalizedCartItem[] => {
  const candidates = [body?.cartItems, body?.items, body?.lines];
  const normalized: NormalizedCartItem[] = [];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;

    for (const entry of candidate) {
      const parsed = normalizeCartItem(entry);
      if (parsed) normalized.push(parsed);
    }

    if (normalized.length) break;
  }

  return normalized;
};

const toStripeAmount = (amount: number) => {
  const value = Math.round(amount * 100);
  return value > 0 ? value : 0;
};

export async function startStorefrontCheckout(body: CheckoutRequestBody) {
  const cartItems = getNormalizedCartItems(body);
  const clerkId =
    typeof body?.customer?.clerkId === "string"
      ? body.customer.clerkId.trim()
      : "";

  if (!cartItems.length || !clerkId) {
    throw new CheckoutError("Not Enough Data To Checkout", 400, {
      code: "MISSING_CART_OR_CUSTOMER",
    });
  }

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

  for (const item of cartItems) {
    const amount = toStripeAmount(item.price);
    if (amount <= 0) {
      throw new CheckoutError("INVALID_ITEM_AMOUNT", 400, {
        code: "INVALID_ITEM",
        item,
      });
    }

    const metadata: Record<string, string> = {};
    if (item.productId) metadata.productId = item.productId;
    if (item.size) metadata.size = item.size;
    if (item.color) metadata.color = item.color;

    lineItems.push({
      price_data: {
        currency: "eur",
        unit_amount: amount,
        product_data: {
          name: item.title,
          metadata,
        },
      },
      quantity: item.quantity,
    });
  }

  const normalizedShip =
    String(body?.shippingOption || "").toUpperCase() === "EXPRESS"
      ? "EXPRESS"
      : "FREE";
  const shippingMap = {
    FREE: { id: "FREE_DELIVERY", amount: 0, label: "Livraison standard" },
    EXPRESS: {
      id: "EXPRESS_DELIVERY",
      amount: 10,
      label: "Livraison express",
    },
  } as const;

  const chosen = shippingMap[normalizedShip];
  const shippingAmount = toStripeAmount(chosen.amount);
  if (shippingAmount > 0) {
    lineItems.push({
      price_data: {
        currency: "eur",
        unit_amount: shippingAmount,
        product_data: {
          name: chosen.label,
          metadata: { isShipping: "true", shippingRate: chosen.id },
        },
      },
      quantity: 1,
    });
  }

  const storeUrl = process.env.ECOMMERCE_STORE_URL || "";
  if (!storeUrl) {
    throw new CheckoutError("Missing storefront URL configuration", 500);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${storeUrl}/payment_success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${storeUrl}/the-hoop`,
    line_items: lineItems,
    client_reference_id: clerkId || undefined,
    metadata: {
      shippingRate: chosen.id,
      clerkId,
    },
    billing_address_collection: "required",
    shipping_address_collection: {
      allowed_countries: ["FR", "BE", "DE", "ES", "IT", "LU", "NL", "PT", "CH"],
    },
    phone_number_collection: { enabled: true },
    automatic_tax: { enabled: false },
    allow_promotion_codes: true,
  });

  if (!session.url) {
    throw new CheckoutError("Stripe session missing redirect URL", 502);
  }

  return {
    approveUrl: session.url,
    orderId: session.id,
    raw: session,
  };
}
