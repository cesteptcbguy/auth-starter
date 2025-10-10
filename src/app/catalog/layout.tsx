import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CatalogLayoutProps = {
  children: ReactNode;
};

export default async function CatalogLayout({ children }: CatalogLayoutProps) {
  const headerList = await headers();
  const invokePath = headerList.get("x-invoke-path");
  const nextUrl = headerList.get("next-url");
  const originalUrl = headerList.get("x-original-url");
  const rawPath = invokePath ?? nextUrl ?? originalUrl ?? "/catalog";
  const queryString = headerList.get("x-invoke-query") ?? headerList.get("next-query") ?? "";

  let currentPath =
    typeof rawPath === "string"
      ? rawPath.startsWith("/")
        ? rawPath
        : `/${rawPath}`
      : "/catalog";

  currentPath = currentPath.replace(/\/+$/, "") || "/";

  if (!currentPath.startsWith("/catalog")) {
    currentPath = "/catalog";
  }

  const currentLocation = `${currentPath}${queryString}`;

  let user: { id: string } | null = null;
  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase.auth.getUser();
    if (!error) {
      user = data.user ?? null;
    }
  } catch (error) {
    console.warn("[catalog/layout] Supabase unavailable, treating as logged out:", error);
  }

  if (!user) {
    redirect(`/sign-in?redirectTo=${encodeURIComponent(currentLocation)}`);
  }

  return <>{children}</>;
}
