"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Logged-in users hitting /login are sent to the app. Runs client-side so the
 * login page HTML is not blocked on Prisma/DB (which otherwise can hang and
 * leave /login loading forever when the database is unreachable).
 */
export function RedirectIfAuthed({ from }: { from: string }) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();
    const timeoutMs = 12_000;
    const t = setTimeout(() => ac.abort(), timeoutMs);

    fetch("/api/auth/me", { credentials: "include", signal: ac.signal })
      .then(async (res) => {
        if (cancelled || !res.ok) return;
        const data = (await res.json()) as {
          user?: { role?: "PATIENT" | "ADMIN" };
        };
        if (cancelled || !data.user) return;
        const isAdmin = data.user.role === "ADMIN";
        const next =
          isAdmin && !from.startsWith("/admin") ? "/admin/dashboard" : from;
        router.replace(next);
      })
      .catch(() => {
        /* offline / DB down: stay on login */
      })
      .finally(() => clearTimeout(t));

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [from, router]);

  return null;
}
