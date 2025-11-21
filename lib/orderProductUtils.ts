type RawOrderProduct = Record<string, unknown> & {
  product?: unknown;
  productLegacyId?: unknown;
  color?: unknown;
  size?: unknown;
  quantity?: unknown;
};

type CollapsedOrderProduct = RawOrderProduct & {
  quantity: number;
};

const normalizePart = (value: unknown): string => {
  if (typeof value === "string") return value.trim().toLowerCase();
  if (value === null || value === undefined) return "";
  return String(value).trim().toLowerCase();
};

const extractProductId = (item: RawOrderProduct): string => {
  if (item.product !== undefined && item.product !== null) {
    try {
      return String(item.product);
    } catch {
      /* ignore */
    }
  }
  if (item.productLegacyId !== undefined && item.productLegacyId !== null) {
    try {
      return String(item.productLegacyId);
    } catch {
      /* ignore */
    }
  }
  if (item.titleSnapshot) return normalizePart(item.titleSnapshot);
  return "";
};

export const collapseOrderProducts = (
  products: RawOrderProduct[] | null | undefined,
): CollapsedOrderProduct[] => {
  const merged = new Map<string, CollapsedOrderProduct>();

  if (!Array.isArray(products)) return [];

  for (const row of products) {
    if (!row || typeof row !== "object") continue;
    const quantity = Number((row as RawOrderProduct).quantity ?? 0);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;

    const key = [
      normalizePart(extractProductId(row)),
      normalizePart((row as RawOrderProduct).size),
      normalizePart((row as RawOrderProduct).color),
    ].join("|");

    if (merged.has(key)) {
      const existing = merged.get(key)!;
      if (quantity > existing.quantity) {
        existing.quantity = quantity;
      }
    } else {
      merged.set(key, {
        ...(row as RawOrderProduct),
        quantity,
      });
    }
  }

  return Array.from(merged.values());
};
