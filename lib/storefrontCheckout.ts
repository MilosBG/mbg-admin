/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from "mongoose";
import fs from "fs";

import { connectToDB } from "@/lib/mongoDB";
import Order from "@/lib/models/Order";
import Product from "@/lib/models/Product";
import Customer from "@/lib/models/Customer";

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

export type CheckoutContactPayload = {
  email?: unknown;
  phone?: unknown;
};

export type CheckoutShippingPayload = {
  firstName?: unknown;
  lastName?: unknown;
  address?: unknown;
  city?: unknown;
  postalCode?: unknown;
  country?: unknown;
  phone?: unknown;
};

export type CheckoutRequestBody = {
  cartItems?: unknown;
  items?: unknown;
  lines?: unknown;
  customer?: {
    clerkId?: unknown;
    email?: unknown;
    name?: unknown;
  };
  shippingOption?: unknown;
  contact?: CheckoutContactPayload;
  shippingAddress?: CheckoutShippingPayload;
  notes?: unknown;
  metadata?: unknown;
};

type NormalizedContact = {
  email: string;
  phone?: string | null;
};

type NormalizedShippingAddress = {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string | null;
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
    if (typeof titleSource === "string" && titleSource.trim()) return truncateField(titleSource.trim());
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

const normalizeString = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "bigint") return String(value).trim();
  return "";
};

const requireString = (value: unknown, message: string, code: string): string => {
  const normalized = normalizeString(value);
  if (!normalized) {
    throw new CheckoutError(message, 400, { code });
  }
  return normalized;
};

const normalizeContact = (
  contact: CheckoutContactPayload | undefined,
  customer: CheckoutRequestBody["customer"],
): NormalizedContact => {
  const candidates = [
    contact?.email,
    customer?.email,
  ];
  let email = "";
  for (const candidate of candidates) {
    const value = normalizeString(candidate);
    if (value) {
      email = value.toLowerCase();
      break;
    }
  }
  if (!email) {
    throw new CheckoutError("Contact email is required.", 400, {
      code: "MISSING_CONTACT_EMAIL",
    });
  }

  const phone = normalizeString(contact?.phone);

  return {
    email,
    ...(phone ? { phone } : {}),
  };
};

const normalizeShippingAddress = (
  shipping: CheckoutShippingPayload | undefined,
): NormalizedShippingAddress => {
  if (!shipping || typeof shipping !== "object") {
    throw new CheckoutError("Shipping details are required.", 400, {
      code: "MISSING_SHIPPING",
    });
  }

  const firstName = requireString(
    shipping.firstName,
    "Shipping first name is required.",
    "MISSING_SHIPPING_FIRST_NAME",
  );
  const lastName = requireString(
    shipping.lastName,
    "Shipping last name is required.",
    "MISSING_SHIPPING_LAST_NAME",
  );
  const address = requireString(
    shipping.address,
    "Shipping address is required.",
    "MISSING_SHIPPING_ADDRESS",
  );
  const city = requireString(
    shipping.city,
    "Shipping city is required.",
    "MISSING_SHIPPING_CITY",
  );
  const postalCode = requireString(
    shipping.postalCode,
    "Shipping postal code is required.",
    "MISSING_SHIPPING_POSTAL_CODE",
  );
  const country = requireString(
    shipping.country,
    "Shipping country is required.",
    "MISSING_SHIPPING_COUNTRY",
  );
  const phone = normalizeString(shipping.phone);

  return {
    firstName,
    lastName,
    address,
    city,
    postalCode,
    country,
    ...(phone ? { phone } : {}),
  };
};

const normalizeNotes = (value: unknown): string | undefined => {
  const normalized = normalizeString(value);
  return normalized || undefined;
};

const normalizeMetadata = (value: unknown): Record<string, unknown> | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const source = value as Record<string, unknown>;
  const metadata: Record<string, unknown> = {};

  const origin = normalizeString(source.origin);
  if (origin) metadata.origin = origin;

  if (source.generatedAt !== undefined) {
    const generatedAt = Number(source.generatedAt);
    if (Number.isFinite(generatedAt)) metadata.generatedAt = generatedAt;
  }

  const sourceLabel = normalizeString(source.source);
  if (sourceLabel) metadata.source = sourceLabel;

  return Object.keys(metadata).length ? metadata : undefined;
};

const SHIPPING_MAP = {
  FREE: { id: "FREE_DELIVERY", amount: 0 },
  EXPRESS: { id: "EXPRESS_DELIVERY", amount: 10 },
} as const;

const mergeOrderLines = (items: NormalizedCartItem[]): NormalizedCartItem[] => {
  const merged = new Map<string, NormalizedCartItem>();

  for (const item of items) {
    const productKey = (() => {
      const raw = item.productId ?? "";
      if (Types.ObjectId.isValid(raw)) return new Types.ObjectId(raw).toString();
      return raw.trim().toLowerCase();
    })();

    const key = [
      productKey || item.title.toLowerCase(),
      (item.size || "").toLowerCase(),
      (item.color || "").toLowerCase(),
    ].join("|");

    if (merged.has(key)) {
      const existing = merged.get(key)!;
      existing.quantity = Math.max(existing.quantity, item.quantity);
    } else {
      merged.set(key, { ...item });
    }
  }

  return Array.from(merged.values()).map((value) => {
    const qty = Number(value.quantity ?? 0);
    const normalizedQty = Number.isFinite(qty) ? qty : 0;
    return {
      ...value,
      quantity: normalizedQty,
    };
  }).filter((value) => Number(value.quantity ?? 0) > 0);
};

const buildOrderProductKey = (item: NormalizedCartItem): string => {
  const rawId = item.productId ?? "";
  const normalizedId = Types.ObjectId.isValid(rawId)
    ? new Types.ObjectId(rawId).toString()
    : rawId.trim().toLowerCase();
  const size = (item.size ?? "").trim().toLowerCase();
  const color = (item.color ?? "").trim().toLowerCase();
  return [normalizedId || item.title.toLowerCase(), size, color].join("|");
};

type OrderProductDoc = {
  product?: Types.ObjectId;
  productLegacyId?: string;
  color?: string;
  size?: string;
  quantity: number;
  unitPrice: number;
  titleSnapshot: string;
};

const buildOrderProductsFromCart = (cartItems: NormalizedCartItem[]): OrderProductDoc[] => {
  const grouped = new Map<string, OrderProductDoc>();

  for (const item of cartItems) {
    const key = buildOrderProductKey(item);
    const qty = Number(item.quantity ?? 0);
    if (!Number.isFinite(qty) || qty <= 0) continue;

    const existing = grouped.get(key);
    if (existing) {
      existing.quantity = Math.max(existing.quantity, qty);
      continue;
    }

    const doc: OrderProductDoc = {
      quantity: qty,
      unitPrice: item.price,
      titleSnapshot: item.title,
    };

    if (item.color) doc.color = item.color;
    if (item.size) doc.size = item.size;
    if (item.productId) {
      if (Types.ObjectId.isValid(item.productId)) {
        doc.product = new Types.ObjectId(item.productId);
      } else {
        doc.productLegacyId = item.productId;
      }
    }

    grouped.set(key, doc);
  }

  return Array.from(grouped.values());
};

export async function startStorefrontCheckout(body: CheckoutRequestBody) {
  const rawCartItems = getNormalizedCartItems(body);
  logCheckoutDebug("raw-cart", rawCartItems);
  const cartItems = mergeOrderLines(rawCartItems);
  logCheckoutDebug("merged-cart", cartItems);
  const debugCart = (items: NormalizedCartItem[]) =>
    items.map((item) => ({
      productId: item.productId ?? null,
      title: item.title,
      price: item.price,
      quantity: item.quantity,
      size: item.size ?? null,
      color: item.color ?? null,
    }));
  console.log("[checkout] cart normalization", {
    rawCount: rawCartItems.length,
    normalizedCount: cartItems.length,
    rawItems: debugCart(rawCartItems),
    mergedItems: debugCart(cartItems),
  });
  const clerkId =
    typeof body?.customer?.clerkId === "string" ? body.customer.clerkId.trim() : "";

  if (!cartItems.length) {
    throw new CheckoutError("Cart is empty.", 400, {
      code: "MISSING_CART_ITEMS",
    });
  }

  const contact = normalizeContact(body.contact, body.customer);
  const shipping = normalizeShippingAddress(body.shippingAddress);
  const notes = normalizeNotes(body.notes);
  const metadata = normalizeMetadata(body.metadata);

  const normalizedShip =
    String(body?.shippingOption || "").toUpperCase() === "EXPRESS" ? "EXPRESS" : "FREE";
  const chosen = normalizedShip === "EXPRESS" ? SHIPPING_MAP.EXPRESS : SHIPPING_MAP.FREE;

  const orderProducts = buildOrderProductsFromCart(cartItems);
  logCheckoutDebug("order-products", orderProducts);
  console.log("[checkout] order products prepared", {
    cartItems: cartItems.length,
    orderProducts: orderProducts.length,
    products: orderProducts.map((item) => ({
      product:
        item.product instanceof Types.ObjectId
          ? item.product.toString()
          : item.productLegacyId ?? null,
      quantity: item.quantity,
      size: item.size ?? null,
      color: item.color ?? null,
      price: item.unitPrice,
      title: item.titleSnapshot ?? null,
    })),
  });

  if (!orderProducts.length) {
    throw new CheckoutError("Unable to build order lines.", 400, { code: "EMPTY_ORDER_LINES" });
  }

  const itemSubtotal = cartItems.reduce((sum, ci) => sum + ci.price * ci.quantity, 0);
  const normalizedItemTotal = Number(itemSubtotal.toFixed(2));
  const shippingAmount = Number(chosen.amount.toFixed(2));
  const totalAmount = Number((normalizedItemTotal + shippingAmount).toFixed(2));

  await connectToDB();

  const shippingFullName = `${shipping.firstName} ${shipping.lastName}`.trim();
  const contactInfo: Record<string, unknown> = {
    email: contact.email,
  };
  if (contact.phone) contactInfo.phone = contact.phone;
  if (shippingFullName) contactInfo.name = shippingFullName;

  const shippingDocument: Record<string, unknown> = {
    firstName: shipping.firstName,
    lastName: shipping.lastName,
    street: shipping.address,
    city: shipping.city,
    postalCode: shipping.postalCode,
    country: shipping.country,
  };
  if (shipping.phone) shippingDocument.phone = shipping.phone;

  const orderPayload: Record<string, unknown> = {
    status: "PENDING",
    fulfillmentStatus: "PENDING",
    products: orderProducts,
    shippingAddress: shippingDocument,
    shippingMethod: normalizedShip,
    shippingRate: chosen.id,
    totalAmount,
  };

  if (clerkId) {
    orderPayload.customerClerkId = clerkId;
  }

  if (Object.keys(contactInfo).length) {
    orderPayload.contact = contactInfo;
  }

  if (notes) {
    orderPayload.notes = notes;
  }

  if (metadata) {
    orderPayload.metadata = metadata;
  }

  let order: any;
  try {
    order = await Order.create(orderPayload);
    console.log("[checkout] created order", { orderId: order?._id?.toString() ?? "unknown", clerkId, totalAmount });
  } catch (err) {
    throw new CheckoutError("Failed to create order.", 500, {
      code: "ORDER_PERSISTENCE_FAILED",
      cause: err instanceof Error ? err.message : err,
    });
  }

  try {
    await reserveStockForOrderItems(orderProducts);
  } catch (inventoryError) {
    console.warn("[checkout] failed to reserve stock for order", order?._id?.toString(), inventoryError);
  }

  const preferredName = normalizeString(body.customer?.name) || shippingFullName;
  const preferredEmail = normalizeString(body.customer?.email) || contact.email;

  if (clerkId && (preferredName || preferredEmail)) {
    const update = {
      $setOnInsert: { clerkId },
      $addToSet: { orders: order._id },
    } as {
      $setOnInsert: { clerkId: string };
      $addToSet: { orders: typeof order._id };
      $set?: Record<string, unknown>;
    };
    const set: Record<string, unknown> = {};
    if (preferredName) set.name = preferredName;
    if (preferredEmail) set.email = preferredEmail.toLowerCase();
    if (Object.keys(set).length) {
      update.$set = set;
    }

    try {
      await Customer.updateOne(
        { clerkId },
        update,
        { upsert: true, setDefaultsOnInsert: true },
      );
    } catch (err) {
      console.warn("[storefront_checkout] failed to upsert customer", err);
    }
  } else if (!clerkId && preferredEmail) {
    const update: {
      $setOnInsert: { email: string };
      $addToSet: { orders: typeof order._id };
      $set?: Record<string, unknown>;
    } = {
      $setOnInsert: { email: preferredEmail },
      $addToSet: { orders: order._id },
    };
    const set: Record<string, unknown> = {};
    if (preferredName) set.name = preferredName;
    if (Object.keys(set).length) update.$set = set;

    try {
      await Customer.updateOne(
        { email: preferredEmail },
        update,
        { upsert: true, setDefaultsOnInsert: true },
      );
    } catch (err) {
      console.warn("[storefront_checkout] failed to upsert guest customer", err);
    }
  }

  const orderId = order._id.toString();

  return {
    approveUrl: null,
    orderId,
    reference: orderId,
    currency: "EUR",
    total: totalAmount,
    itemTotal: normalizedItemTotal,
    shippingAmount,
    shippingRate: chosen.id,
    message: `ORDER ${orderId} CREATED. WE WILL REACH OUT WITH PAYMENT INSTRUCTIONS.`,
  };
}

async function reserveStockForOrderItems(orderItems: Array<any>) {
  for (const item of orderItems) {
    const productId = item.product;
    const qty = Number(item.quantity || 0);
    if (!productId || !qty || qty <= 0) continue;

    const color =
      typeof item.color === "string" && item.color && item.color !== "N/A"
        ? item.color
        : undefined;
    const size =
      typeof item.size === "string" && item.size && item.size !== "N/A" ? item.size : undefined;

    let matched = 0;
    if (color || size) {
      const match: any = { _id: productId, variants: { $elemMatch: {} } };
      if (color) match.variants.$elemMatch.color = color;
      if (size) match.variants.$elemMatch.size = size;
      const updateResult = await Product.updateOne(match, {
        $inc: { "variants.$.stock": -qty, countInStock: -qty },
      });
      matched = updateResult.matchedCount || updateResult.modifiedCount || 0;

      await Product.updateOne(
        { _id: productId },
        { $set: { "variants.$[v].stock": 0 } },
        { arrayFilters: [{ "v.stock": { $lt: 0 } }] } as any,
      ).catch(() => {});
    }

    if (!matched) {
      await Product.updateOne(
        { _id: productId },
        { $inc: { countInStock: -qty } },
      ).catch(() => {});
    }

    const latest = await Product.findById(productId).select("countInStock").lean();
    if (latest && typeof (latest as any).countInStock === "number" && (latest as any).countInStock < 0) {
      await Product.updateOne({ _id: productId }, { $set: { countInStock: 0 } });
    }
  }
}



const DEBUG_LOG_PATH = "tmp_checkout_debug.jsonl";

const logCheckoutDebug = (label: string, payload: unknown) => {
  if (!DEBUG_LOG_PATH) return;
  try {
    const entry = JSON.stringify({
      label,
      at: new Date().toISOString(),
      payload,
    });
    fs.appendFileSync(DEBUG_LOG_PATH, `${entry}\n`);
  } catch {
    // ignore
  }
};
