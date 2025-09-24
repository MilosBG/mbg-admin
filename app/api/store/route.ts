import { NextResponse } from "next/server";

import { getMilosBGState } from "@/lib/siteStatusStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getMilosBGState();
  return NextResponse.json(state);
}
