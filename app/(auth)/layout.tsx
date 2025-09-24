import type { Metadata } from "next";
import "../globals.css";

import { ClerkProvider } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: {
    template: "%s | Milos BG - ADMIN AUTH",
    default: "Milos BG - ADMIN AUTH",
  },
  description: "Admin auth dashboard to manage Milos BG's data",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="font-kanit text-sm antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
