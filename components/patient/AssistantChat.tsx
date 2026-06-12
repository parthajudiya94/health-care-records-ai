"use client";

import { useEffect, useMemo, useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { GhostButton } from "@/components/ui/GhostButton";

type Msg = { role: "user" | "assistant"; content: string };

const STORAGE_KEY = "patient_ai_chat_sessionId";

export function AssistantChat() {
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Ask me about your uploaded reports (e.g., “What does my latest lab summary say?”). I can also answer general questions, but I can’t diagnose.",
    },
  ]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = useMemo(() => text.trim().length > 0 && !loading, [loading, text]);

  useEffect(() => {
    const sid = window.localStorage.getItem(STORAGE_KEY);
    if (sid) setSessionId(sid);
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const sid = sessionId;
    let cancelled = false;
    async function loadHistory() {
      try {
        const u = new URL("/api/ai/chat", window.location.origin);
        u.searchParams.set("sessionId", sid);
        const res = await fetch(u.toString(), { credentials: "include" });
        const data = (await res.json().catch(() => ({}))) as {
          messages?: Array<{ role: string; content: string }>;
        };
        if (!res.ok) return;
        const restored: Msg[] =
          (data.messages ?? [])
            .filter((m) => m && typeof m.content === "string")
            .map((m) => ({
              role: m.role === "assistant" ? "assistant" : "user",
              content: m.content,
            })) ?? [];
        if (!cancelled && restored.length) setMsgs(restored);
      } catch {
        // ignore
      }
    }
    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  function newChat() {
    window.localStorage.removeItem(STORAGE_KEY);
    setSessionId(null);
    setMsgs((m) => m.slice(0, 1));
    setError(null);
  }

  async function send() {
    const t = text.trim();
    if (!t || loading) return;
    setText("");
    setError(null);
    setLoading(true);
    setMsgs((m) => [...m, { role: "user", content: t }]);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(sessionId ? { message: t, sessionId } : { message: t }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        reply?: string;
        sessionId?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "Could not get a reply");
        setMsgs((m) => [...m, { role: "assistant", content: "I couldn’t respond just now. Please try again." }]);
        return;
      }
      if (data.sessionId) {
        setSessionId(data.sessionId);
        window.localStorage.setItem(STORAGE_KEY, data.sessionId);
      }
      setMsgs((m) => [...m, { role: "assistant", content: String(data.reply ?? "") }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Personal AI assistant</h2>
          <p className="text-xs text-ink-muted">
            Uses your recent summaries when available. No diagnoses.
          </p>
        </div>
        <GhostButton
          type="button"
          className="py-1.5 text-xs"
          onClick={newChat}
          disabled={loading || !sessionId}
        >
          New chat
        </GhostButton>
      </div>

      <div className="mt-4 h-72 overflow-y-auto rounded-2xl border border-border bg-paper/40 p-3">
        <div className="space-y-2">
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
          {loading ? (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-border/60 bg-white/70 px-3 py-2 text-sm text-ink-muted">
                …
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="mt-2 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex items-end gap-2">
        <textarea
          className="min-h-[44px] flex-1 resize-none rounded-2xl border border-border bg-white px-3 py-2 text-sm text-ink shadow-inner focus:outline-none focus:ring-2 focus:ring-brand/40"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask a question…"
          rows={2}
        />
        <PrimaryButton type="button" onClick={send} disabled={!canSend} className="px-4 py-2">
          Send
        </PrimaryButton>
      </div>
    </Panel>
  );
}

