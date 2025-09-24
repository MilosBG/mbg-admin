/* eslint-disable @typescript-eslint/no-unused-vars */
import Chapter from "@/lib/models/Chapter";
import { connectToDB } from "@/lib/mongoDB";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest) => {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    await connectToDB();

    const { title, description, image } = await req.json();

    const existingChapter = await Chapter.findOne({ title });

    if (existingChapter) {
      return new NextResponse("Chapter already isists", { status: 400 });
    }

    if (!title || !image) {
      return new NextResponse("Title and image are required", { status: 400 });
    }

    const newChapter = await Chapter.create({
      title,
      description,
      image,
    });

    await newChapter.save();

    return NextResponse.json(newChapter, { status: 200 });
  } catch (err) {
    console.log("[chapters_POST]", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
};

export const GET = async (req: NextResponse) => {
  try {
    await connectToDB();

    const chapters = await Chapter.find().sort({ createdAt: "desc" });

    return NextResponse.json(chapters, { status: 200 });
  } catch (err) {
    console.log("[chapter_GET]", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
};

export const dynamic = "force-dynamic";