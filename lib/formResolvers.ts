/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Resolver } from "react-hook-form";

// Product form types match UI fields
export type ProductFormValues = {
  title: string;
  description: string;
  media: string[];
  category: string;
  chapters: string[];
  tags: string[];
  sizes: string[];
  colors: string[];
  price: number;
  expense: number;
  countInStock: number;
  variants?: { color?: string; size?: string; stock: number }[];
  fetchToStore?: boolean;
};

export const productFormResolver: Resolver<ProductFormValues> = async (rawValues) => {
  const v = rawValues as any;

  // Coerce numbers
  const price = Number(v.price);
  const expense = Number(v.expense);
  const countInStock = Math.max(0, Number(v.countInStock));

  const normVariants = Array.isArray(v.variants)
    ? (v.variants as any[]).map((it) => ({
        color: it?.color ? String(it.color) : undefined,
        size: it?.size ? String(it.size) : undefined,
        stock: Math.max(0, Number(it?.stock ?? 0)) || 0,
      }))
    : undefined;

  const values: ProductFormValues = {
    title: String(v.title ?? ""),
    description: String(v.description ?? "").trim(),
    media: Array.isArray(v.media) ? v.media.filter(Boolean) : [],
    category: String(v.category ?? ""),
    chapters: Array.isArray(v.chapters) ? v.chapters : [],
    tags: Array.isArray(v.tags) ? v.tags : [],
    sizes: Array.isArray(v.sizes) ? v.sizes : [],
    colors: Array.isArray(v.colors) ? v.colors : [],
    price: Number.isFinite(price) ? price : 0,
    expense: Number.isFinite(expense) ? expense : 0,
    countInStock: Number.isFinite(countInStock) ? countInStock : 0,
    variants: normVariants,
    fetchToStore: Boolean(v.fetchToStore),
  };

  const errors: Record<string, any> = {};
  const req = (key: keyof ProductFormValues, label: string) => {
    if (!values[key] || (Array.isArray(values[key]) && (values[key] as any[]).length === 0)) {
      errors[key] = { type: "required", message: `${label} is required` };
    }
  };

  req("title", "Title");
  req("description", "Description");
  req("media", "Image");
  req("category", "Category");

  if (!(values.price > 0)) {
    errors.price = { type: "min", message: "Price must be greater than 0" };
  }
  if (!(values.expense >= 0)) {
    errors.expense = { type: "min", message: "Expense must be 0 or more" };
  }
  if (!(values.countInStock >= 0)) {
    errors.countInStock = { type: "min", message: "Stock must be 0 or more" };
  }

  return {
    values: Object.keys(errors).length ? {} as any : values,
    errors,
  };
};

// Chapter form
export type ChapterFormValues = {
  title: string;
  description: string;
  image: string;
};

export const chapterFormResolver: Resolver<ChapterFormValues> = async (rawValues) => {
  const v = rawValues as any;
  const values: ChapterFormValues = {
    title: String(v.title ?? ""),
    description: String(v.description ?? "").trim(),
    image: String(v.image ?? ""),
  };

  const errors: Record<string, any> = {};
  if (!values.title) errors.title = { type: "required", message: "Title is required" };
  if (!values.description) errors.description = { type: "required", message: "Description is required" };
  if (!values.image) errors.image = { type: "required", message: "Image is required" };

  return {
    values: Object.keys(errors).length ? {} as any : values,
    errors,
  };
};
