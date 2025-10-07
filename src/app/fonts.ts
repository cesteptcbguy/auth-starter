import localFont from "next/font/local";

// Inter (regular + bold, add more weights if you have them)
export const Inter = localFont({
  src: [
    { path: "./fonts/Inter_18pt-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Inter_18pt-Bold.ttf", weight: "700", style: "normal" },
  ],
  display: "swap",
});

// Geist Sans (variable name for CSS usage: --font-geist-sans)
export const GeistSans = localFont({
  src: [
    { path: "./fonts/Geist-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Geist-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-geist-sans",
  display: "swap",
});

// Geist Mono (variable name for CSS usage: --font-geist-mono)
export const GeistMono = localFont({
  src: [
    { path: "./fonts/GeistMono-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/GeistMono-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-geist-mono",
  display: "swap",
});
