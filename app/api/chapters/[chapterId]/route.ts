import Chapter from "@/lib/models/Chapter";
import Product from "@/lib/models/Product";
import { connectToDB } from "@/lib/mongoDB";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Params = { chapterId: string };

export const GET = async (
  _req: NextRequest,
  { params }: { params: Promise<Params> }
) => {
  try {
    const { chapterId } = await params;       // ✅ await params
    await connectToDB();

    const chapter = await Chapter.findById(chapterId).populate({
      path: "products",
      model: Product, // or "Product"
    });

    if (!chapter) {
      return NextResponse.json({ message: "Chapter not found" }, { status: 404 });
    }

    return NextResponse.json(chapter, { status: 200 });
  } catch (err) {
    console.log("[chapterId_GET]", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
};

export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<Params> }
) => {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { chapterId } = await params;       // ✅ await params
    await connectToDB();

    let chapter = await Chapter.findById(chapterId);
    if (!chapter) return new NextResponse("Chapter not found", { status: 404 });

    const { title, description, image } = await req.json();
    if (!title || !image) {
      return new NextResponse("Title and image are required", { status: 400 });
    }

    chapter = await Chapter.findByIdAndUpdate(
      chapterId,
      { title, description, image },
      { new: true }
    );

    return NextResponse.json(chapter, { status: 200 });
  } catch (err) {
    console.log("chapterId_POST", err);
    return new NextResponse("Internal error", { status: 500 });
  }
};

export const DELETE = async (
  _req: NextRequest,
  { params }: { params: Promise<Params> }
) => {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { chapterId } = await params;       // ✅ await params
    await connectToDB();

    await Chapter.findByIdAndDelete(chapterId);
    await Product.updateMany(
      { chapters: chapterId },
      { $pull: { chapters: chapterId } }
    );

    return new NextResponse("Chapter is deleted", { status: 200 });
  } catch (err) {
    console.log("chapterId_DELETE", err);
    return new NextResponse("Internal error", { status: 500 });
  }
};
