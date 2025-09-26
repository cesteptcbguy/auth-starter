import type { Metadata } from "next";
import "./globals.css";
import "@/styles/print.css";
import { Toaster } from "sonner";

// import the local fonts
import { Inter, GeistSans, GeistMono } from "./fonts";

export const metadata: Metadata = {
  title: "Bold Builder",
  description: "by Christopher Estep at Bold Bear Publishing",
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
      <body className="antialiased">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
