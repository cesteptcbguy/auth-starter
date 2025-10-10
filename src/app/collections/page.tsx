// src/app/collections/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";

export default function CollectionsRedirectPage() {
  redirect("/dashboard");
}
