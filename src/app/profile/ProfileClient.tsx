"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { getSupabaseClient } from "@/lib/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type FormMessage = { type: "error" | "success"; text: string };

const MIN_PASSWORD_LENGTH = 8;

export default function ProfileClient() {
  const supabase = getSupabaseClient();
  const router = useRouter();
  const isScreenshotMode = useMemo(
    () => process.env.NEXT_PUBLIC_SCREENSHOT_MODE === "1",
    []
  );

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<FormMessage | null>(null);

  // Basic identity
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        const user = data.user;
        if (!cancelled && user) {
          setEmail(user.email ?? "");
          const meta = user.user_metadata ?? {};
          setFirstName((meta.first_name as string) || "");
          setLastName((meta.last_name as string) || "");
          setCompany((meta.company as string) || "");
          setTitle((meta.title as string) || "");
        }
      } catch (error) {
        console.error("[profile] getUser failed", error);
        if (!cancelled) {
          setMessage({ type: "error", text: "Unable to load your profile." });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function handleSaveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (savingProfile) return;
    setMessage(null);
    setSavingProfile(true);

    try {
      if (isScreenshotMode) {
        toast.success("Saved profile (screenshot mode)");
        setSavingProfile(false);
        return;
      }

      const full_name = `${firstName} ${lastName}`.trim();

      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
          company,
          title,
          full_name, // keep legacy full_name in sync for other UI bits
        },
      });
      if (error) throw error;

      toast.success("Profile updated");
      setMessage({ type: "success", text: "Profile updated." });
      router.refresh();
    } catch (error: unknown) {
      const text =
        error instanceof Error ? error.message : "Could not update profile.";
      toast.error(text);
      setMessage({ type: "error", text });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (savingPassword) return;

    setMessage(null);
    if (!newPassword.trim() || newPassword.length < MIN_PASSWORD_LENGTH) {
      setMessage({
        type: "error",
        text: `Use at least ${MIN_PASSWORD_LENGTH} characters for your new password.`,
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords must match." });
      return;
    }

    setSavingPassword(true);
    try {
      if (isScreenshotMode) {
        toast.success("Password updated (screenshot mode)");
        setSavingPassword(false);
        return;
      }
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      toast.success("Password updated");
      setMessage({
        type: "success",
        text: "Password updated. Use it the next time you sign in.",
      });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: unknown) {
      const text =
        error instanceof Error ? error.message : "Could not update password.";
      toast.error(text);
      setMessage({ type: "error", text });
    } finally {
      setSavingPassword(false);
    }
  }

  const dashboardHref: Route = "/dashboard";

  if (loading) {
    return (
      <main className="mx-auto max-w-lg p-6">
        <div className="flex items-center gap-2 text-sm text-foreground/70">
          <Loader2 className="size-4 animate-spin" /> Loading profile…
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg space-y-8 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Your profile</h1>
        <p className="text-sm text-foreground/80">
          Update your contact details or change your password.
        </p>
      </header>

      <div aria-live="polite" aria-atomic="true" className="space-y-2">
        {message ? (
          <Alert variant={message.type === "error" ? "destructive" : "success"}>
            <AlertTitle>
              {message.type === "error" ? "Something went wrong" : "All set"}
            </AlertTitle>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      {/* Profile details */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-medium">Profile</h2>
        <form className="space-y-4" onSubmit={handleSaveProfile} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={email} readOnly />
            </div>

            <div className="space-y-2">
              <Label htmlFor="first-name">First name</Label>
              <Input
                id="first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last-name">Last name</Label>
              <Input
                id="last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (e.g., Curriculum Designer)"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </span>
              ) : (
                "Save changes"
              )}
            </Button>
            <Button variant="outline" asChild>
              <Link href={dashboardHref}>Back to dashboard</Link>
            </Button>
          </div>
        </form>
      </section>

      {/* Password */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-medium">Change password</h2>
        <form className="space-y-4" onSubmit={handleChangePassword} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={MIN_PASSWORD_LENGTH}
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={MIN_PASSWORD_LENGTH}
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={savingPassword}>
              {savingPassword ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Updating…
                </span>
              ) : (
                "Update password"
              )}
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
