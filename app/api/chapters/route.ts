
import Chapter from "@/lib/models/Chapter";
import { connectToDB } from "@/lib/mongoDB";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

type ChapterPayload = {
  title?: unknown;
  description?: unknown;
  image?: unknown;
};

const toStringOrEmpty = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export const POST = async (req: NextRequest) => {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    await connectToDB();

    const { title, description, image } = (await req.json()) as ChapterPayload;
    const normalizedTitle = toStringOrEmpty(title);
    const normalizedImage = toStringOrEmpty(image);
    const normalizedDescription = typeof description === "string" ? description : "";

    if (!normalizedTitle || !normalizedImage) {
      return new NextResponse("Title and image are required", { status: 400 });
    }

    const existingChapter = await Chapter.findOne({ title: normalizedTitle });
    if (existingChapter) {
      return new NextResponse("Chapter already exists", { status: 400 });
    }

    const newChapter = await Chapter.create({
      title: normalizedTitle,
      description: normalizedDescription,
      image: normalizedImage,
    });

    await newChapter.save();

    return NextResponse.json(newChapter, { status: 201 });
  } catch (err) {
    console.log("[chapters_POST]", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
};

export const GET = async () => {
  try {
    await connectToDB();

    const chapters = await Chapter.find().sort({ createdAt: "desc" });

    return NextResponse.json(chapters, { status: 200 });
  } catch (err) {
    console.log("[chapters_GET]", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
};

export const dynamic = "force-dynamic";
