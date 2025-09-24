import { authMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/api/store",
  "/api/store/status",
  "/api/storefront/status",
  "/api/maintenance/status",
  "/api/status",
  "/api/v1/status",
  "/api/v1/store/status",
  "/api/milos-bg/offline",
]);

export default authMiddleware({
  publicRoutes: isPublicRoute,
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
