// src/lib/profile.ts
import type {
  PostgrestError,
  PostgrestSingleResponse,
  SupabaseClient,
} from "@supabase/supabase-js";

export type UserProfileRole = "customer" | "developer" | "admin";

export type UserProfile = {
  id: string;
  auth_user_id: string;
  email: string;
  org_id: number | null;
  role: UserProfileRole;
  created_at: string;
};

export const USER_PROFILE_COLUMNS =
  "id,auth_user_id,email,org_id,role,created_at" as const;

export type ProfileResult = {
  profile: UserProfile | null;
  error: PostgrestError | null;
  status?: number;
};

/**
 * Upsert the user's profile so id === auth_user_id and email is set.
 * Requires RLS insert policy: with check (auth.uid() = auth_user_id)
 */
export async function upsertUserProfile(
  client: SupabaseClient,
  params: { id: string; email: string }
): Promise<ProfileResult> {
  const { data, error, status }: PostgrestSingleResponse<UserProfile> =
    await client
      .from("user_profiles")
      .upsert(
        { id: params.id, auth_user_id: params.id, email: params.email },
        { onConflict: "id" }
      )
      .select(USER_PROFILE_COLUMNS)
      .single();

  return { profile: data ?? null, error, status };
}

/**
 * Fetch the current user's profile by auth_user_id.
 * Works with the RLS select policy allowing own row.
 */
export async function getCurrentUserProfile(
  client: SupabaseClient,
  userId: string
): Promise<ProfileResult> {
  const { data, error, status }: PostgrestSingleResponse<UserProfile | null> =
    await client
      .from("user_profiles")
      .select(USER_PROFILE_COLUMNS)
      .eq("auth_user_id", userId)
      .maybeSingle();

  return { profile: (data as UserProfile) ?? null, error, status };
}

/**
 * Simple display helpers
 */
export function deriveProfileName(profile: UserProfile | null): string {
  if (!profile?.email) return "Account";
  const [name] = profile.email.split("@");
  return name || profile.email;
}

export function deriveProfileInitial(profile: UserProfile | null): string {
  const source = profile?.email ?? "";
  return source.trim().charAt(0).toUpperCase() || "B";
}
