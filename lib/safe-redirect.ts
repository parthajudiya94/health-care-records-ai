/**
 * Limit open redirects: only same-app relative paths.
 */
export function safeAppPath(
  from: string | undefined,
  fallback: string
): string {
  if (!from) return fallback;
  const t = from.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return fallback;
  if (t.includes("://") || t.includes("\0") || t.includes("..")) {
    return fallback;
  }
  return t;
}
