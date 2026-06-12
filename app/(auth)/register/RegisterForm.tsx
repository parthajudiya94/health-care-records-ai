"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Stack } from "@/components/ui/Stack";
import { Panel } from "@/components/ui/Panel";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not register");
        return;
      }
      router.push("/patient/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Panel className="w-full max-w-md p-8 shadow-md">
      <form onSubmit={onSubmit}>
        <p className="font-[family-name:var(--font-display)] text-2xl text-tint">
          Open your workspace
        </p>
        <p className="text-sm text-ink-muted mt-1 mb-5">
          Password must be at least 8 characters. This is a demo; use a
          test email you control.
        </p>
        <Stack gap="gap-4">
          <Field
            id="name"
            label="Name"
            name="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Field
            id="remail"
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Field
            id="rpassword"
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            hint="At least 8 characters"
          />
        </Stack>
        {error ? (
          <p className="text-sm text-error pt-2" role="alert">
            {error}
          </p>
        ) : null}
        <div className="pt-6 flex items-center justify-between gap-2">
          <Link
            className="text-sm text-ink-muted hover:text-tint transition"
            href="/login"
          >
            Already have access?
          </Link>
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? "…" : "Create account"}
          </PrimaryButton>
        </div>
      </form>
    </Panel>
  );
}
