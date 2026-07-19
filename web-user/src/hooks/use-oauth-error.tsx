import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { getErrorMessage } from "@/lib/error-messages";
import type { ApiErrorCode } from "@/schema/error.schema";

/**
 * Surface a failed Google sign-in.
 *
 * The OAuth callback is a browser redirect, not an XHR, so it can't flow through
 * the axios error interceptor that reports every other API failure — it hands
 * the reason back as `?error=CODE` on the login URL instead. This translates it
 * with the same code→message table and then strips it from the URL, so a refresh
 * or a shared link doesn't replay a stale error.
 */
export function useOAuthError(): void {
  const [searchParams, setSearchParams] = useSearchParams();
  const shownRef = useRef(false);

  useEffect(() => {
    const code = searchParams.get("error");
    if (!code || shownRef.current) {
      return;
    }
    shownRef.current = true;

    // Some outcomes are deliberately silent (e.g. the user cancelled consent).
    const message = getErrorMessage(code as ApiErrorCode);
    if (message) {
      toast.error(message);
    }

    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("error");
        return next;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams]);
}
