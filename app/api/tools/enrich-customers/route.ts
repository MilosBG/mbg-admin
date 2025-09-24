/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoDB";
import Customer from "@/lib/models/Customer";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS });
}

// One-time enrichment: fill missing name/email from Clerk by clerkId
export async function POST(_req: NextRequest) {
  try {
    const secret = process.env.CLERK_SECRET_KEY;
    if (!secret) {
      return new NextResponse("Missing CLERK_SECRET_KEY", { status: 500, headers: CORS });
    }

    await connectToDB();

    const toFix = await Customer.find({
      $or: [{ name: { $in: [null, ""] } }, { email: { $in: [null, ""] } }],
      clerkId: { $exists: true, $ne: "" },
    })
      .select("_id clerkId name email")
      .lean();

    let updated = 0;
    for (const c of toFix) {
      try {
        const res = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(c.clerkId)}` as any, {
          headers: { Authorization: `Bearer ${secret}` },
          cache: "no-store",
        } as any);
        if (!res.ok) continue;
        const u: any = await res.json();
        const name = [u?.first_name, u?.last_name].filter(Boolean).join(" ");
        const primaryEmailId = u?.primary_email_address_id;
        const email = (u?.email_addresses || []).find((e: any) => e.id === primaryEmailId)?.email_address || u?.email_addresses?.[0]?.email_address || "";

        const set: any = {};
        if (!c.name && name) set.name = name;
        if (!c.email && email) set.email = email.toLowerCase();
        if (Object.keys(set).length) {
          await Customer.updateOne({ _id: c._id }, { $set: set });
          updated += 1;
        }
      } catch {}
    }

    return NextResponse.json({ ok: true, checked: toFix.length, updated }, { headers: CORS });
  } catch (e) {
    console.error("[tools/enrich-customers]", e);
    return new NextResponse("Failed", { status: 500, headers: CORS });
  }
}

