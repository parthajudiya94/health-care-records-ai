"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Stack } from "@/components/ui/Stack";
import { Panel } from "@/components/ui/Panel";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

export function LoginForm({ from }: { from: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        user?: { role?: "PATIENT" | "ADMIN" };
      };
      if (!res.ok) {
        setError(data.error || "Could not sign in");
        return;
      }
      const isAdmin = data.user?.role === "ADMIN";
      const next = isAdmin && !from.startsWith("/admin") ? "/admin/dashboard" : from;
      router.push(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Panel className="w-full max-w-md p-8 shadow-md">
      <form onSubmit={onSubmit} className="space-y-2">
        <p className="font-[family-name:var(--font-display)] text-2xl text-tint">
          Welcome back
        </p>
        <p className="text-sm text-ink-muted mb-4">
          Sign in to see your report summaries and reminders.
        </p>
        <Stack gap="gap-4">
          <Field
            id="email"
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Field
            id="password"
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Stack>
        {error ? (
          <p className="text-sm text-error pt-2" role="alert">
            {error}
          </p>
        ) : null}
        <div className="pt-2 flex items-center justify-between gap-2">
          <Link
            className="text-sm text-ink-muted hover:text-tint transition"
            href="/register"
          >
            Create an account
          </Link>
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? "…" : "Sign in"}
          </PrimaryButton>
        </div>
      </form>
    </Panel>
  );
}
