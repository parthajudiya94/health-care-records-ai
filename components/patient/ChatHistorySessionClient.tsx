"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

type Msg = { role: "user" | "assistant"; content: string; createdAt?: string };

export function ChatHistorySessionClient({ sessionId }: { sessionId: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const title = useMemo(() => {
    if (!msgs.length) return "Chat session";
    const t = msgs[msgs.length - 1]?.createdAt ?? msgs[0]?.createdAt;
    if (!t) return "Chat session";
    return `Chat session · ${new Date(t).toLocaleString()}`;
  }, [msgs]);

  const canSend = useMemo(() => text.trim().length > 0 && !sending, [sending, text]);

  async function loadMessages(sid: string) {
    const u = new URL("/api/ai/chat", window.location.origin);
    u.searchParams.set("sessionId", sid);
    const res = await fetch(u.toString(), {
      credentials: "include",
      cache: "no-store",
    });
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      // If JSON parsing fails, treat it as an error instead of silently showing empty state.
      return { ok: false as const, error: "Unexpected response from server" };
    }
    const parsed = (data ?? {}) as {
      messages?: Array<{ role: string; content: string; createdAt?: string }>;
      error?: string;
    };
    if (!res.ok) return { ok: false as const, error: parsed.error || "Could not load chat session" };
    if (!Array.isArray(parsed.messages)) {
      return { ok: false as const, error: "Unexpected response from server" };
    }

    const restored: Msg[] =
      (parsed.messages ?? [])
        .filter((m) => m && typeof m.content === "string")
        .map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
          createdAt: m.createdAt,
        })) ?? [];
    return { ok: true as const, messages: restored };
  }

  useEffect(() => {
    const sid = (sessionId ?? "").trim();
    if (!sid) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const out = await loadMessages(sid);
        if (!out.ok) {
          if (!cancelled) setError(out.error);
          return;
        }
        if (!cancelled) setMsgs(out.messages);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  async function send() {
    const sid = (sessionId ?? "").trim();
    const t = text.trim();
    if (!sid || !t || sending) return;

    setText("");
    setSendError(null);
    setSending(true);
    setMsgs((m) => [...m, { role: "user", content: t }]);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: t, sessionId: sid }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        reply?: string;
        error?: string;
      };
      if (!res.ok) {
        setSendError(data.error || "Could not get a reply");
        setMsgs((m) => [
          ...m,
          { role: "assistant", content: "I couldn’t respond just now. Please try again." },
        ]);
        return;
      }
      setMsgs((m) => [...m, { role: "assistant", content: String(data.reply ?? "") }]);

      const refreshed = await loadMessages(sid);
      if (refreshed.ok && refreshed.messages.length) setMsgs(refreshed.messages);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">{title}</h1>
          <p className="text-sm text-ink-muted">Continue this conversation here.</p>
        </div>
        <Link
          href="/patient/chat-history"
          className="inline-flex rounded-xl border border-border bg-paper px-3 py-1.5 text-xs font-medium text-ink-muted hover:text-ink hover:bg-white/60 transition"
        >
          Back
        </Link>
      </div>

      <Panel className="p-5">
        {error ? (
          <p className="text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-2 h-[28rem] overflow-y-auto rounded-2xl border border-border bg-paper/40 p-3">
          <div className="space-y-2">
            {loading && !msgs.length ? (
              <div className="text-sm text-ink-muted">Loading…</div>
            ) : null}
            {!loading && !msgs.length ? (
              <div className="text-sm text-ink-muted">No messages.</div>
            ) : null}
            {msgs.map((m, idx) => (
              <div key={idx} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={[
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    m.role === "user"
                      ? "bg-tint text-white"
                      : "bg-white/70 text-ink border border-border/60",
                  ].join(" ")}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending ? (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-border/60 bg-white/70 px-3 py-2 text-sm text-ink-muted">
                  …
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {sendError ? (
          <p className="mt-2 text-sm text-error" role="alert">
            {sendError}
          </p>
        ) : null}

        <div className="mt-3 flex items-end gap-2">
          <textarea
            className="min-h-[44px] flex-1 resize-none rounded-2xl border border-border bg-white px-3 py-2 text-sm text-ink shadow-inner focus:outline-none focus:ring-2 focus:ring-brand/40"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask a question…"
            rows={2}
            disabled={sending}
          />
          <PrimaryButton type="button" onClick={send} disabled={!canSend} className="px-4 py-2">
            Send
          </PrimaryButton>
        </div>
      </Panel>
    </div>
  );
}

