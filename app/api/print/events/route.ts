/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import emitter from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: any) => {
        const line = `data: ${JSON.stringify(payload)}\n\n`;
        controller.enqueue(encoder.encode(line));
      };

      const onOrder = (data: any) => send({ type: "order", ...data });
      emitter.on("order", onOrder);

      // heartbeat every 25s to keep the connection alive
      const hb = setInterval(() => {
        try { controller.enqueue(encoder.encode(": ping\n\n")); } catch {}
      }, 25000);

      // initial hello
      send({ type: "hello", t: Date.now() });

      return () => {
        clearInterval(hb);
        emitter.off("order", onOrder);
      };
    },
    cancel() {},
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

