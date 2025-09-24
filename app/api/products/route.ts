import Chapter from "@/lib/models/Chapter";
import Product from "@/lib/models/Product";
import { connectToDB } from "@/lib/mongoDB";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

type VariantPayload = {
  color?: string | null;
  size?: string | null;
  stock?: number | string | null;
};

type CreateProductPayload = {
  title?: string;
  description?: string;
  media?: unknown;
  category?: string;
  chapters?: unknown;
  tags?: unknown;
  sizes?: unknown;
  colors?: unknown;
  price?: number | string;
  expense?: number | string;
  countInStock?: number | string | null;
  variants?: VariantPayload[] | null;
  fetchToStore?: boolean;
};

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const parseVariants = (
  variants: CreateProductPayload["variants"]
): Array<{ color?: string; size?: string; stock: number }> | undefined => {
  if (!Array.isArray(variants)) return undefined;

  const parsed: Array<{ color?: string; size?: string; stock: number }> = [];
  for (const entry of variants) {
    if (!entry || typeof entry !== "object") continue;
    const color = typeof entry.color === "string" && entry.color.trim() ? entry.color : undefined;
    const size = typeof entry.size === "string" && entry.size.trim() ? entry.size : undefined;
    const stockValue = toNumber(entry.stock);
    const stock = stockValue !== undefined && stockValue >= 0 ? stockValue : 0;

    parsed.push({
      ...(color ? { color } : {}),
      ...(size ? { size } : {}),
      stock,
    });
  }

  return parsed.length > 0 ? parsed : undefined;
};

export const POST = async (req: NextRequest) => {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    await connectToDB();
    const {
      title,
      description,
      media,
      category,
      chapters,
      tags,
      sizes,
      colors,
      price,
      expense,
      countInStock,
      variants,
      fetchToStore,
    } = (await req.json()) as CreateProductPayload;

    if (!title || !description || !media || !category || price === undefined || expense === undefined) {
      return new NextResponse("Not enough data to create a procduct", {
        status: 400,
      });
    }

    const cis = toNumber(countInStock);
    const cisValid = cis !== undefined && cis >= 0;
    const normVariants = parseVariants(variants);
    const sumVariants = normVariants?.reduce((sum, variant) => sum + variant.stock, 0);

    const newProduct = await Product.create({
      title,
      description,
      media,
      category,
      chapters,
      tags,
      sizes,
      colors,
      price,
      expense,
      ...(typeof fetchToStore === "boolean" ? { fetchToStore } : {}),
      ...(normVariants ? { variants: normVariants } : {}),
      ...(sumVariants !== undefined
        ? { countInStock: sumVariants }
        : cisValid
        ? { countInStock: cis }
        : {}),
    });

    await newProduct.save();

    if (Array.isArray(chapters)) {
      for (const chapterId of chapters) {
        const id = typeof chapterId === "string" ? chapterId : String(chapterId);
        const chapter = await Chapter.findById(id);
        if (chapter) {
          chapter.products.push(newProduct._id);
          await chapter.save();
        }
      }
    }

    return NextResponse.json(newProduct, { status: 200 });
  } catch (err) {
    console.log("[products_POST]", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
};

export const GET = async (req: NextRequest) => {
  try {
    await connectToDB();

    const availableOnly = req.nextUrl.searchParams.get("availableOnly");
    const filter: Record<string, unknown> = {};
    if (String(availableOnly).toLowerCase() === "true") {
      filter.countInStock = { $gt: 0 };
    }

    const products = await Product.find(filter)
      .sort({ createdAt: "desc" })
      .populate({ path: "chapters", model: Chapter });
    return NextResponse.json(products, { status: 200 });
  } catch (err) {
    console.log("[products_GET]", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
};

export const dynamic = "force-dynamic";
