import { NextResponse } from "next/server";
import { getStorefrontServiceToken } from "@/lib/serviceTokens";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const tokenBypassRoute = createRouteMatcher([
  "/api/checkout",
  "/api/storefront/checkout",
  "/api/orders/customers/:customerId",
  "/api/orders/:orderId",
]);

const isPublicRoute = createRouteMatcher([
  "/api/store",
  "/api/store/status",
  "/api/storefront/status",
  "/api/maintenance/status",
  "/api/status",
  "/api/v1/status",
  "/api/v1/store/status",
  "/api/milos-bg/offline",
  "/sign-in",
  "/sign-up",
]);

function extractServiceToken(req: Request) {
  const header = req.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (match) return match[1].trim();
  const alt = req.headers.get("x-storefront-service-token");
  return alt ? alt.trim() : null;
}

const middleware = clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  if (tokenBypassRoute(req)) {
    const expected = getStorefrontServiceToken();
    const provided = extractServiceToken(req);
    if (expected && provided === expected) {
      return NextResponse.next();
    }
  }

  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  return NextResponse.next();
});

export default middleware;
export { middleware };

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

