import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const REDIRECT_COOKIE = "bb_redirect_to";

export async function GET() {
  const store = await cookies();
  const raw = store.get(REDIRECT_COOKIE)?.value || "";
  let redirectTo = "";

  if (raw) {
    try {
      const decoded = decodeURIComponent(raw);
      if (decoded.startsWith("/")) {
        redirectTo = decoded;
      }
    } catch (error) {
      console.warn("[redirect-fallback] failed to decode", error);
    }
  }

  store.set({ name: REDIRECT_COOKIE, value: "", path: "/", maxAge: 0 });

  return new NextResponse(redirectTo, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
