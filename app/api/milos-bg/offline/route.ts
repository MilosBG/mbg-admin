import { NextResponse } from "next/server";

import { getOfflineHtml } from "@/lib/siteStatusStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const html = await getOfflineHtml();
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
