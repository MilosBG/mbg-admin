import type { Metadata } from "next";
import "../globals.css";

import { ClerkProvider } from "@clerk/nextjs";
import { ToasterProvider } from "@/lib/ToasterProvider";

export const metadata: Metadata = {
  title: {
    template: "%s | Milos BG - PRINT",
    default: "Milos BG - PRINT",
  },
  description: "Print-friendly layout without navigation",
};

export default function PrintLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="font-kanit text-sm antialiased">
          <ToasterProvider />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

