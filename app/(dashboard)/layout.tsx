import type { Metadata } from "next";
import "../globals.css";

import { ClerkProvider } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import LeftSideBar from "@/components/layout/LeftSideBar";
import TopBar from "@/components/layout/TopBar";
import { ToasterProvider } from "@/lib/ToasterProvider";
import { isAuthorized } from "@/lib/authz";

export const metadata: Metadata = {
  title: "Milos BG | ADMIN",
  description: "Admin dashboard to manage Milos BG's data",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Require authentication
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Enforce authorization; redirect unauthorized users to the public store
  const storeUrl = process.env.ECOMMERCE_STORE_URL || "https://milos-bg.com";
  if (!isAuthorized(user)) {
    redirect(storeUrl);
  }

  return (
    <ClerkProvider>
      <html lang="en">
        <body className="font-kanit text-sm antialiased">
          <ToasterProvider />
          <div className="flex max-lg:flex-col" data-dashboard-shell>
            <LeftSideBar data-dashboard-sidebar />
            <TopBar data-dashboard-topbar />
            <div className="flex-1" data-dashboard-content>{children}</div>
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
