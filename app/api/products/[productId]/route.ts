/* eslint-disable @typescript-eslint/no-explicit-any */
import Chapter from "@/lib/models/Chapter";
import Product from "@/lib/models/Product";
import { connectToDB } from "@/lib/mongoDB";
import emitter from "@/lib/events";
import { auth } from "@clerk/nextjs/server";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (
  req: NextRequest,
  ctx: { params: Promise<{ productId: string }> }
) => {
  try {
    const { productId } = await ctx.params;       // ⬅️ await params
    await connectToDB();

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return new NextResponse(JSON.stringify({ message: "Invalid product id" }), { status: 400 });
    }

    const product = await Product.findById(productId).populate({
      path: "chapters",
      model: Chapter,
    });

    if (!product) {
      return new NextResponse(JSON.stringify({ message: "Product not found" }), { status: 404 });
    }

    return NextResponse.json(product, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": `${process.env.ECOMMERCE_STORE_URL}`,
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (err) {
    console.log("[productId_GET]", err);
    return new NextResponse("Internal error", { status: 500 });
  }
};

export const POST = async (
  req: NextRequest,
  ctx: { params: Promise<{ productId: string }> }
) => {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { productId } = await ctx.params;       // ⬅️ await params
    await connectToDB();

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return new NextResponse(JSON.stringify({ message: "Invalid product id" }), { status: 400 });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return new NextResponse(JSON.stringify({ message: "Product not found" }), { status: 404 });
    }

    const {
      title,
      description,
      media,
      category,
      chapters = [],
      tags,
      sizes,
      colors,
      price,
      expense,
      countInStock,
      variants,
      fetchToStore,
    } = await req.json();

    if (!title || !description || !media || !category || price == null || expense == null) {
      return new NextResponse(
        JSON.stringify({ message: "Not enough data to create a new product" }),
        { status: 400 },
      );
    }

    const currentChapterIds = product.chapters.map(
      (id: mongoose.Types.ObjectId) => id.toString(),
    );
    const newChapterIds = chapters.map((id: string) => id.toString());

    const toAdd = newChapterIds.filter((id: any) => !currentChapterIds.includes(id));
    const toRemove = currentChapterIds.filter((id: any) => !newChapterIds.includes(id));

    if (toAdd.length) {
      await Chapter.updateMany({ _id: { $in: toAdd } }, { $addToSet: { products: product._id } });
    }
    if (toRemove.length) {
      await Chapter.updateMany({ _id: { $in: toRemove } }, { $pull: { products: product._id } });
    }

    const cis = Number(countInStock);
    const cisValid = Number.isFinite(cis) && cis >= 0;
    const normVariants = Array.isArray(variants)
      ? (variants as any[])
          .map((v) => ({
            color: v?.color ? String(v.color) : undefined,
            size: v?.size ? String(v.size) : undefined,
            stock: Number(v?.stock ?? 0) || 0,
          }))
      : undefined;
    const sumVariants = Array.isArray(normVariants)
      ? normVariants.reduce((s, v) => s + (Number(v.stock) || 0), 0)
      : undefined;

    const updatedProduct = await Product.findByIdAndUpdate(
      product._id,
      {
        title,
        description,
        media,
        category,
        chapters: newChapterIds,
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
      },
      { new: true },
    ).populate({ path: "chapters", model: Chapter });

    try {
      // Broadcast stock changes (and variants) to connected clients
      const payload: any = {
        kind: "stock",
        productId: String(product._id),
        countInStock: (updatedProduct as any)?.countInStock,
      };
      if (Array.isArray((updatedProduct as any)?.variants)) {
        payload.variants = (updatedProduct as any).variants;
      }
      emitter.emit("product", payload);
    } catch {}

    return NextResponse.json(updatedProduct, { status: 200 });
  } catch (err) {
    console.log("[productId_POST]", err);
    return new NextResponse("Internal error", { status: 500 });
  }
};

export const DELETE = async (
  req: NextRequest,
  ctx: { params: Promise<{ productId: string }> }
) => {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { productId } = await ctx.params;       // ⬅️ await params
    await connectToDB();

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return new NextResponse(JSON.stringify({ message: "Invalid product id" }), { status: 400 });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return new NextResponse(JSON.stringify({ message: "Product not found" }), { status: 404 });
    }

    await Product.findByIdAndDelete(product._id);

    await Promise.all(
      product.chapters.map((chapterId: string) =>
        Chapter.findByIdAndUpdate(chapterId, { $pull: { products: product._id } }),
      ),
    );

    return new NextResponse(JSON.stringify({ message: "Product deleted" }), { status: 200 });
  } catch (err) {
    console.log("[productId_DELETE]", err);
    return new NextResponse("Internal error", { status: 500 });
  }
};

export const dynamic = "force-dynamic";
