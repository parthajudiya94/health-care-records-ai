"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Stack } from "@/components/ui/Stack";
import { Panel } from "@/components/ui/Panel";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

export function NewRecordForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, note: note.trim() || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        record?: { id: string };
      };
      if (!res.ok) {
        setError(data.error || "Could not create record");
        return;
      }
      if (data.record?.id) {
        router.push(`/patient/records/${data.record.id}`);
        router.refresh();
        return;
      }
      setError("Unexpected response");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Panel className="p-6 md:max-w-lg">
      <h2 className="text-ink font-[family-name:var(--font-display)] text-xl text-tint">
        New record
      </h2>
      <p className="text-ink-muted mt-1 text-sm">
        A record groups related files (e.g. one visit or one lab draw). You can
        add files on the next screen.
      </p>
      <form onSubmit={onSubmit} className="mt-5">
        <Stack gap="gap-4">
          <Field
            id="title"
            label="Title"
            name="title"
            required
            minLength={1}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Cardiology follow-up, March 2025"
            autoFocus
          />
          <div>
            <label
              htmlFor="note"
              className="text-ink-muted mb-1.5 block text-sm font-medium tracking-wide uppercase"
            >
              Note (optional)
            </label>
            <textarea
              id="note"
              name="note"
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="border-border focus:border-sage/60 w-full rounded-xl border bg-white px-3.5 py-2.5 text-ink shadow-inner"
              placeholder="Context you will remember later — not sent to AI until you run a summary."
            />
          </div>
        </Stack>
        {error ? (
          <p className="text-error pt-3 text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => router.push("/patient/records")}
            className="text-ink-muted text-sm hover:text-ink"
          >
            Cancel
          </button>
          <PrimaryButton type="submit" disabled={loading || !title.trim()}>
            {loading ? "…" : "Create & continue"}
          </PrimaryButton>
        </div>
      </form>
    </Panel>
  );
}
