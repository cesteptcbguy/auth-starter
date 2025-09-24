import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Dashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // Ensure a profile row exists (PK = auth user id)
  const { error } = await supabase
    .from("user_profiles")
    .upsert(
      { id: user.id, auth_user_id: user.id, role: "customer" as any },
      { onConflict: "auth_user_id" }
    );

  if (error) console.error("user_profiles upsert error:", error);

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p>Welcome {user.email}</p>
      <form action="/dashboard/signout" method="post">
        <button className="px-3 py-2 rounded bg-black text-white" formAction="/dashboard/signout">
          Sign out
        </button>
      </form>
    </main>
  );
}
