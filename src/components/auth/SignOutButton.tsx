"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type SignOutButtonProps = {
  className?: string;
  onSignedOut?: () => void;
};

export function SignOutButton({ className, onSignedOut }: SignOutButtonProps) {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (isSigningOut) return;

    setIsSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      onSignedOut?.();
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("[SignOutButton] Failed to sign out", error);
      toast.error("Unable to sign out. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isSigningOut}
      aria-disabled={isSigningOut}
      className={cn(
        "inline-flex items-center gap-1 border-0 bg-transparent px-0 py-0 text-sm font-medium text-primary underline-offset-4 transition hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "cursor-pointer disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
    >
      {isSigningOut ? "Signing out…" : "Sign out"}
    </button>
  );
}
