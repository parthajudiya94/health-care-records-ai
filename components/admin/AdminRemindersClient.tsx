"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { Field } from "@/components/ui/Field";
import { GhostButton } from "@/components/ui/GhostButton";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { DataTable, Td } from "@/components/list/DataTable";
import { type PageSize } from "@/lib/pagination";

type ReminderType = "APPOINTMENT" | "MEDICATION" | "TEST" | "OTHER";

type Row = {
  id: string;
  userId: string;
  title: string;
  datetime: string;
  type: ReminderType;
  user?: { id: string; email: string } | null;
};

const TYPES: { v: ReminderType; l: string }[] = [
  { v: "APPOINTMENT", l: "Appointment" },
  { v: "MEDICATION", l: "Medication" },
  { v: "TEST", l: "Test" },
  { v: "OTHER", l: "Other" },
];

export function AdminRemindersClient() {
  const [userId, setUserId] = useState("");
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);

  const [createOpen, setCreateOpen] = useState(false);
  const [create, setCreate] = useState({
    userId: "",
    title: "",
    datetimeLocal: "",
    type: "APPOINTMENT" as ReminderType,
  });
  const [saving, setSaving] = useState(false);

  const qs = useMemo(() => {
    const u = new URL("/api/admin/reminders", window.location.origin);
    if (userId.trim()) u.searchParams.set("userId", userId.trim());
    return u;
  }, [userId]);

  const load = useCallback(
    async (args: { page: number; pageSize: PageSize; qs: string }) => {
      setLoading(true);
      setError(null);
      try {
        const u = new URL(args.qs);
        u.searchParams.set("page", String(args.page));
        u.searchParams.set("pageSize", String(args.pageSize));
        const res = await fetch(u.toString(), { credentials: "include" });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          items?: Row[];
          total?: number;
        };
        if (!res.ok) {
          setError(data.error || "Could not load reminders");
          return;
        }
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void load({ page, pageSize, qs: qs.toString() });
  }, [page, pageSize, qs, load]);

  function toIso(local: string) {
    return new Date(local).toISOString();
  }

  async function createReminder() {
    setError(null);
    if (!create.userId.trim() || !create.title.trim() || !create.datetimeLocal) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId: create.userId.trim(),
          title: create.title.trim(),
          datetime: toIso(create.datetimeLocal),
          type: create.type,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(j.error || "Could not create reminder");
        return;
      }
      setCreate({ userId: "", title: "", datetimeLocal: "", type: "APPOINTMENT" });
      setCreateOpen(false);
      setPage(1);
      await load({ page: 1, pageSize, qs: qs.toString() });
    } finally {
      setSaving(false);
    }
  }

  async function deleteReminder(id: string) {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/reminders/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(j.error || "Could not delete reminder");
        return;
      }
      setPage(1);
      await load({ page: 1, pageSize, qs: qs.toString() });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Panel className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <Field
              id="r-userId"
              label="Filter by userId (optional)"
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                setPage(1);
              }}
              placeholder="Paste a userId to narrow the list"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <GhostButton
              type="button"
              onClick={() => {
                setPage(1);
                void load({ page: 1, pageSize, qs: qs.toString() });
              }}
              disabled={loading}
            >
              Refresh
            </GhostButton>
            <PrimaryButton type="button" onClick={() => setCreateOpen((v) => !v)}>
              {createOpen ? "Close" : "Create reminder"}
            </PrimaryButton>
          </div>
        </div>
      </Panel>

      {createOpen ? (
        <Panel className="p-5">
          <h2 className="text-sm font-semibold text-ink">Create reminder</h2>
          <p className="mt-1 text-xs text-ink-muted">
            Creates a reminder for a specific user.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field
              id="c-uid"
              label="UserId"
              value={create.userId}
              onChange={(e) => setCreate((f) => ({ ...f, userId: e.target.value }))}
              placeholder="Target user's id"
            />
            <Field
              id="c-title"
              label="Title"
              value={create.title}
              onChange={(e) => setCreate((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Follow-up appointment"
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium tracking-wide uppercase text-ink-muted" htmlFor="c-when">
                When
              </label>
              <input
                id="c-when"
                type="datetime-local"
                className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-ink shadow-inner"
                value={create.datetimeLocal}
                onChange={(e) => setCreate((f) => ({ ...f, datetimeLocal: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium tracking-wide uppercase text-ink-muted" htmlFor="c-type">
                Type
              </label>
              <select
                id="c-type"
                className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-ink shadow-inner"
                value={create.type}
                onChange={(e) => setCreate((f) => ({ ...f, type: e.target.value as ReminderType }))}
              >
                {TYPES.map((t) => (
                  <option key={t.v} value={t.v}>
                    {t.l}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <GhostButton type="button" onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancel
            </GhostButton>
            <PrimaryButton
              type="button"
              onClick={createReminder}
              disabled={
                saving ||
                !create.userId.trim() ||
                !create.title.trim() ||
                !create.datetimeLocal
              }
            >
              {saving ? "…" : "Create"}
            </PrimaryButton>
          </div>
        </Panel>
      ) : null}

      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      <DataTable
        headers={["Title", "When", "Type", "User", "Actions"]}
        page={page}
        pageSize={pageSize}
        total={total}
        loading={loading}
        onPageChange={(p) => {
          setPage(p);
          void load({ page: p, pageSize, qs: qs.toString() });
        }}
        onPageSizeChange={(ps) => {
          setPageSize(ps);
          setPage(1);
          void load({ page: 1, pageSize: ps, qs: qs.toString() });
        }}
      >
        {items.map((r) => (
          <tr key={r.id} className="hover:bg-paper/40">
            <Td>
              <p className="font-medium text-ink">{r.title}</p>
              <p className="text-xs text-ink-muted">{r.id}</p>
            </Td>
            <Td>
              <p className="text-sm text-ink">{new Date(r.datetime).toLocaleString()}</p>
            </Td>
            <Td>
              <span className="inline-flex rounded-full border border-border bg-white/60 px-2 py-0.5 text-xs font-medium text-ink">
                {r.type}
              </span>
            </Td>
            <Td>
              {r.user?.email ? (
                <Link className="text-tint text-sm font-medium hover:underline" href={`/admin/users/${r.user.id}`}>
                  {r.user.email}
                </Link>
              ) : (
                <p className="text-xs text-ink-muted">{r.userId}</p>
              )}
            </Td>
            <Td>
              <GhostButton
                type="button"
                className="text-error/90 border-error/30 py-1.5 text-xs"
                onClick={() => void deleteReminder(r.id)}
                disabled={saving}
              >
                Delete
              </GhostButton>
            </Td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

