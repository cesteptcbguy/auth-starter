import type { Metadata } from "next";
import "./globals.css";
import "@/styles/print.css";
import { Toaster } from "sonner";

// import the local fonts
import { Inter, GeistSans, GeistMono } from "./fonts";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: {
    default: "BoldBuilder",
    template: "%s | BoldBuilder",
  },
  description:
    "Tools for curating education content, managing collections, and publishing catalogs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${Inter.className} ${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="antialiased bg-background">
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <div className="flex-1">{children}</div>
        </div>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
