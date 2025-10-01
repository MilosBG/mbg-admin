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

const MAX_ITEM_FIELD_LENGTH = 127;

const truncateField = (value: string) =>
  value.length > MAX_ITEM_FIELD_LENGTH ? value.slice(0, MAX_ITEM_FIELD_LENGTH) : value;

const normalizeCartItem = (value: unknown): NormalizedCartItem | null => {
  if (!value || typeof value !== "object") return null;

  const entry = value as LegacyCartLine & LightweightCartLine;
  const quantity = asQuantity(entry.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) return null;

  const size =
    typeof entry.size === "string" && entry.size.trim().length ? entry.size.trim() : undefined;
  const color =
    typeof entry.color === "string" && entry.color.trim().length ? entry.color.trim() : undefined;

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
      typeof legacy.title === "string" && legacy.title.trim() ? legacy.title : entry.title ?? "";

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
    if (typeof titleSource === "string" && titleSource.trim()) return titleSource.trim();
    const fallback = String(titleSource ?? "").trim();
    return fallback || "Item";
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

const getNormalizedCartItems = (body: CheckoutRequestBody): NormalizedCartItem[] => {
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

const toPayPalItems = (cartItems: NormalizedCartItem[]): Item[] =>
  cartItems.map((ci) => {
    const meta: Record<string, unknown> = {};
    if (ci.productId) meta.productId = ci.productId;
    if (ci.size) meta.size = ci.size;
    if (ci.color) meta.color = ci.color;

    const name = truncateField((ci.title || "Item").trim() || "Item");

    return {
      name,
      unitAmount: toMoneyValue(ci.price),
      quantity: String(ci.quantity),
      ...(ci.productId ? { sku: truncateField(ci.productId) } : {}),
      ...(Object.keys(meta).length ? { description: JSON.stringify(meta) } : {}),
    };
  });

export async function startStorefrontCheckout(body: CheckoutRequestBody) {
  const cartItems = getNormalizedCartItems(body);
  const clerkId =
    typeof body?.customer?.clerkId === "string" ? body.customer.clerkId.trim() : "";

  if (!cartItems.length || !clerkId) {
    throw new CheckoutError("Not Enough Data To Checkout", 400, {
      code: "MISSING_CART_OR_CUSTOMER",
    });
  }

  const items = toPayPalItems(cartItems);
  const itemSubTotal = cartItems.reduce((sum, ci) => sum + ci.price * ci.quantity, 0);

  const normalizedShip =
    String(body?.shippingOption || "").toUpperCase() === "EXPRESS" ? "EXPRESS" : "FREE";
  const shippingMap = {
    FREE: { id: "FREE_DELIVERY", amount: 0 },
    EXPRESS: { id: "EXPRESS_DELIVERY", amount: 20 },
  } as const;

  const chosen = shippingMap[normalizedShip];
  const amountValue = itemSubTotal + chosen.amount;

  const storeUrl = process.env.ECOMMERCE_STORE_URL || "";

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
      returnUrl: storeUrl ? `${storeUrl}/payment_success` : undefined,
      cancelUrl: storeUrl ? `${storeUrl}/the-hoop` : undefined,
    },
  };

  const { result: order } = await payPalOrders.createOrder({
    body: orderRequest,
    prefer: "return=representation",
  });

  const approve = order.links?.find((link) => link.rel === "approve")?.href;
  if (!approve) {
    throw new CheckoutError("No approve link from PayPal", 502);
  }

  return {
    approveUrl: approve,
    orderId: String(order.id || ""),
    raw: order,
  };
}
