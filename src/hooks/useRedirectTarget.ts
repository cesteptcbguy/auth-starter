import { useCallback, useEffect, useState } from "react";

import { isValidRedirect } from "@/lib/redirect";

type UseRedirectTargetResult = {
  redirectTo: string | null;
  setRedirectTo: (value: string | null) => void;
  resolveRedirect: () => Promise<string | null>;
};

export function useRedirectTarget(initial?: string | null): UseRedirectTargetResult {
  const [redirectTo, setRedirectTo] = useState<string | null>(
    initial && isValidRedirect(initial) ? initial : null
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("redirectTo");
    if (fromQuery && isValidRedirect(fromQuery)) {
      setRedirectTo(fromQuery);
    }
  }, []);

  const resolveRedirect = useCallback(async () => {
    if (redirectTo && isValidRedirect(redirectTo)) {
      return redirectTo;
    }

    return null;
  }, [redirectTo]);

  return { redirectTo, setRedirectTo, resolveRedirect };
}
