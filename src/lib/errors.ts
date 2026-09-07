export interface FriendlyError {
  /** Player-facing: plain language, and says what to do next. */
  message: string;
  /** Raw technical text for the "Details" reveal and the console. Null when there is nothing extra to show. */
  detail: string | null;
}

function rawMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "";
}

/**
 * Turn any thrown value into a calm, actionable line for players while keeping
 * the original message as `detail` for the "Details" toggle and the console.
 *
 * Recognised technical failures (network, expired auth, permission, timeout)
 * get a friendly rewrite. Anything that already reads like a human/domain
 * message — a judge verdict, a server validation string — is shown as-is so we
 * never bury a useful explanation; only genuine exception noise is genericised.
 */
export function toFriendlyError(error: unknown): FriendlyError {
  const raw = rawMessage(error).trim();
  const detail = raw || null;
  const lower = raw.toLowerCase();

  const isNetwork =
    (error instanceof TypeError && lower.includes("fetch")) ||
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("load failed") ||
    lower.includes("network request failed");
  if (isNetwork)
    return {
      message:
        "Can't reach the server. Check your internet connection, or any ad-blocker or VPN, then try again.",
      detail,
    };

  if (
    lower.includes("jwt") ||
    lower.includes("session expired") ||
    lower.includes("not authenticated") ||
    (lower.includes("token") && lower.includes("expired"))
  )
    return {
      message: "Your session expired. Sign in again to keep playing.",
      detail,
    };

  if (
    lower.includes("permission denied") ||
    lower.includes("not authorized") ||
    lower.includes("row-level security")
  )
    return {
      message:
        "You don't have access to that. If this looks wrong, sign out and back in.",
      detail,
    };

  if (lower.includes("timeout") || lower.includes("timed out"))
    return {
      message: "The server took too long to respond. Try again in a moment.",
      detail,
    };

  // Unrecognised. A human-written domain message is worth showing verbatim;
  // raw exception noise (a JS error name, an "undefined" access) is not.
  const looksTechnical =
    raw === "" ||
    /^[A-Z]\w*Error:/.test(raw) ||
    lower.includes("undefined") ||
    lower.includes("null is not") ||
    lower.includes("is not a function") ||
    lower.includes("cannot read");
  if (raw && !looksTechnical) return { message: raw, detail: null };
  return { message: "Something went wrong. Try again.", detail };
}
