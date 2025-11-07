const DEFAULT_FALLBACK = "/dashboard";

function isBrowser() {
  return typeof window !== "undefined";
}

export function isValidRedirect(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("/");
}

export function getWebOrigin() {
  if (isBrowser()) {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_WEB_BASE_URL ?? "http://localhost:3000";
}

export function resolveRedirectPath(
  redirectTo: string | null | undefined,
  fallback: string = DEFAULT_FALLBACK
) {
  return isValidRedirect(redirectTo) ? redirectTo : fallback;
}

export function withRedirectParam(
  path: string,
  redirectTo: string | null | undefined
): string {
  if (!isValidRedirect(redirectTo)) {
    return path;
  }

  const base = getWebOrigin();
  const url = new URL(path, base);
  url.searchParams.set("redirectTo", redirectTo);

  const search = url.searchParams.toString();
  return `${url.pathname}${search ? `?${search}` : ""}`;
}
