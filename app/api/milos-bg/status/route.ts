import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getMilosBGState, setMilosBGState } from "@/lib/siteStatusStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getMilosBGState();
  return NextResponse.json(state);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (typeof body?.isOnline !== "boolean") {
      return NextResponse.json(
        { error: "Property 'isOnline' must be provided as a boolean." },
        { status: 400 },
      );
    }

    const state = await setMilosBGState(body.isOnline, body?.offlineMessage);
    return NextResponse.json(state);
  } catch {
    return NextResponse.json(
      { error: "Invalid payload. Expected JSON body with an 'isOnline' boolean." },
      { status: 400 },
    );
  }
}
