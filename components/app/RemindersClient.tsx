"use client";

import { useCallback, useEffect, useState } from "react";
type ReminderType = "APPOINTMENT" | "MEDICATION" | "TEST" | "OTHER";
type ReminderRecurring = "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";
import { Field } from "@/components/ui/Field";
import { Stack } from "@/components/ui/Stack";
import { Panel } from "@/components/ui/Panel";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { GhostButton } from "@/components/ui/GhostButton";
import { DataTable, Td } from "@/components/list/DataTable";
import { type PageSize } from "@/lib/pagination";

type Rem = {
  id: string;
  title: string;
  datetime: string;
  type: ReminderType;
  recurring?: ReminderRecurring;
  createdAt: string;
  updatedAt: string;
};

const TYPES: { v: ReminderType; l: string }[] = [
  { v: "APPOINTMENT", l: "Appointment" },
  { v: "MEDICATION", l: "Medication" },
  { v: "TEST", l: "Test" },
  { v: "OTHER", l: "Other" },
];

const RECURRING: { v: ReminderRecurring; l: string }[] = [
  { v: "NONE", l: "Not recurring" },
  { v: "DAILY", l: "Daily" },
  { v: "WEEKLY", l: "Weekly" },
  { v: "MONTHLY", l: "Monthly" },
];

function typeLabel(t: ReminderType) {
  return TYPES.find((x) => x.v === t)?.l ?? t;
}

function recurringLabel(r?: ReminderRecurring) {
  if (!r) return "Not recurring";
  return RECURRING.find((x) => x.v === r)?.l ?? r;
}

function toLocalValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    "T" +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes())
  );
}

export function RemindersClient() {
  const [items, setItems] = useState<Rem[]>([]);
  const [total, setTotal] = useState(0);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    datetimeLocal: "",
    type: "APPOINTMENT" as ReminderType,
    recurring: "NONE" as ReminderRecurring,
  });
  const [editForm, setEditForm] = useState<{
    title: string;
    datetimeLocal: string;
    type: ReminderType;
    recurring: ReminderRecurring;
  } | null>(null);

  const load = useCallback(async (args: { page: number; pageSize: PageSize }) => {
    setLoading(true);
    setErr(null);
    try {
      const u = new URL("/api/reminders", window.location.origin);
      u.searchParams.set("upcoming", "0");
      u.searchParams.set("page", String(args.page));
      u.searchParams.set("pageSize", String(args.pageSize));
      const res = await fetch(u.toString(), { credentials: "include" });
      const data = (await res.json().catch(() => ({}))) as {
        reminders?: Rem[];
        total?: number;
        error?: string;
      };
      if (!res.ok) {
        setErr(data.error || "Could not load");
        return;
      }
      setItems(data.reminders ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load({ page, pageSize });
  }, [page, pageSize, load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!form.title.trim()) return;
    if (!form.datetimeLocal) {
      setErr("Pick a date and time");
      return;
    }
    const iso = new Date(form.datetimeLocal).toISOString();
    setSaving(true);
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: form.title.trim(),
          datetime: iso,
          type: form.type,
          recurring: form.recurring,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(j.error || "Could not save");
        return;
      }
      setForm({ title: "", datetimeLocal: "", type: "APPOINTMENT", recurring: "NONE" });
      setPage(1);
      await load({ page: 1, pageSize });
    } finally {
      setSaving(false);
    }
  }

  async function removeId(id: string) {
    setErr(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/reminders/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        setErr("Could not delete");
        return;
      }
      setPage(1);
      await load({ page: 1, pageSize });
    } finally {
      setSaving(false);
    }
  }

  function startEdit(r: Rem) {
    setEditing(r.id);
    setEditForm({
      title: r.title,
      datetimeLocal: toLocalValue(r.datetime),
      type: r.type,
      recurring: r.recurring ?? "NONE",
    });
  }

  async function saveEdit(id: string) {
    if (!editForm) return;
    setErr(null);
    setSaving(true);
    try {
      const iso = new Date(editForm.datetimeLocal).toISOString();
      const res = await fetch(`/api/reminders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: editForm.title,
          datetime: iso,
          type: editForm.type,
          recurring: editForm.recurring,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(j.error || "Could not update");
        return;
      }
      setEditing(null);
      setEditForm(null);
      await load({ page, pageSize });
    } finally {
      setSaving(false);
    }
  }

  if (!ready) {
    return (
      <p className="text-ink-muted p-4 text-sm">
        {loading ? "Loading reminders…" : "Loading…"}
      </p>
    );
  }

  return (
    <div className="text-ink space-y-5">
      <form onSubmit={create}>
        <Panel className="p-4 md:p-5">
          <h2 className="text-ink text-sm font-semibold">Add reminder</h2>
          <p className="text-ink-muted text-xs">Stored for your list only. Not sent as notifications in this MVP.</p>
          <div className="mt-3 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end">
            <Stack className="sm:col-span-1" gap="gap-0">
              <Field
                id="new-title"
                label="What"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
                placeholder="e.g. Lab results follow-up"
              />
            </Stack>
            <div>
              <label
                className="text-ink-muted mb-1.5 block text-sm font-medium tracking-wide uppercase"
                htmlFor="new-when"
              >
                When
              </label>
              <input
                id="new-when"
                className="border-border focus:border-sage/60 w-full rounded-xl border bg-white px-3.5 py-2.5 text-ink text-sm"
                type="datetime-local"
                value={form.datetimeLocal}
                onChange={(e) => setForm((f) => ({ ...f, datetimeLocal: e.target.value }))}
                required
              />
            </div>
            <div>
              <label
                className="text-ink-muted mb-1.5 block text-sm font-medium tracking-wide uppercase"
                htmlFor="new-type"
              >
                Type
              </label>
              <select
                id="new-type"
                className="border-border focus:border-sage/60 w-full rounded-xl border bg-white px-3.5 py-2.5 text-ink text-sm"
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value as ReminderType }))
                }
              >
                {TYPES.map((t) => (
                  <option key={t.v} value={t.v}>
                    {t.l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <PrimaryButton type="submit" disabled={saving}>
                {saving ? "…" : "Add reminder"}
              </PrimaryButton>
            </div>
          </div>
        </Panel>
      </form>

      {err ? (
        <p className="text-error text-sm" role="alert">
          {err}
        </p>
      ) : null}

      <div>
        <h2 className="text-ink text-sm font-semibold">All reminders</h2>
        {!items.length ? (
          <p className="text-ink-muted mt-1 text-sm">No reminders yet.</p>
        ) : (
          <DataTable
            headers={["Title", "When", "Type", "Recurring", "Actions"]}
            page={page}
            pageSize={pageSize}
            total={total}
            loading={loading}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(ps) => {
              setPageSize(ps);
              setPage(1);
            }}
            minWidthClassName="min-w-[44rem]"
          >
            {items.map((r) => {
              const isEd = editing === r.id;
              if (isEd && editForm) {
                return (
                  <tr key={r.id} className="hover:bg-paper/40">
                    <Td>
                      <Field
                        id={"e-title-" + r.id}
                        label="Title"
                        value={editForm.title}
                        onChange={(e) => setEditForm((f) => f && { ...f, title: e.target.value })}
                      />
                    </Td>
                    <Td>
                      <label className="text-ink-muted text-xs" htmlFor={"e-when-" + r.id}>
                        When
                      </label>
                      <input
                        id={"e-when-" + r.id}
                        className="border-border mt-0.5 w-full rounded-lg border bg-white px-2 py-1.5 text-sm"
                        type="datetime-local"
                        value={editForm.datetimeLocal}
                        onChange={(e) =>
                          setEditForm((f) => f && { ...f, datetimeLocal: e.target.value })
                        }
                      />
                    </Td>
                    <Td>
                      <label className="text-ink-muted text-xs" htmlFor={"e-type-" + r.id}>
                        Type
                      </label>
                      <select
                        id={"e-type-" + r.id}
                        className="border-border mt-0.5 w-full rounded-lg border bg-white px-2 py-1.5 text-sm"
                        value={editForm.type}
                        onChange={(e) =>
                          setEditForm((f) => f && { ...f, type: e.target.value as ReminderType })
                        }
                      >
                        {TYPES.map((t) => (
                          <option key={t.v} value={t.v}>
                            {t.l}
                          </option>
                        ))}
                      </select>
                    </Td>
                    <Td>
                      <label className="text-ink-muted text-xs" htmlFor={"e-rec-" + r.id}>
                        Recurring
                      </label>
                      <select
                        id={"e-rec-" + r.id}
                        className="border-border mt-0.5 w-full rounded-lg border bg-white px-2 py-1.5 text-sm"
                        value={editForm.recurring}
                        onChange={(e) =>
                          setEditForm(
                            (f) => f && { ...f, recurring: e.target.value as ReminderRecurring }
                          )
                        }
                      >
                        {RECURRING.map((x) => (
                          <option key={x.v} value={x.v}>
                            {x.l}
                          </option>
                        ))}
                      </select>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1.5">
                        <PrimaryButton
                          className="py-1.5 text-xs"
                          type="button"
                          onClick={() => void saveEdit(r.id)}
                          disabled={saving}
                        >
                          Save
                        </PrimaryButton>
                        <GhostButton
                          className="py-1.5 text-xs"
                          type="button"
                          onClick={() => {
                            setEditing(null);
                            setEditForm(null);
                          }}
                        >
                          Cancel
                        </GhostButton>
                      </div>
                    </Td>
                  </tr>
                );
              }

              return (
                <tr key={r.id} className="hover:bg-paper/40">
                  <Td>
                    <p className="text-sm text-ink">{r.title}</p>
                    <p className="text-xs text-ink-muted">{r.id}</p>
                  </Td>
                  <Td>
                    <p className="text-sm text-ink">{new Date(r.datetime).toLocaleString()}</p>
                  </Td>
                  <Td>
                    <span className="inline-flex rounded-full border border-border bg-white/60 px-2 py-0.5 text-xs font-medium text-ink">
                      {typeLabel(r.type)}
                    </span>
                  </Td>
                  <Td>
                    <p className="text-xs text-ink-muted">{recurringLabel(r.recurring)}</p>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1.5">
                      <GhostButton
                        className="py-1.5 text-xs"
                        type="button"
                        onClick={() => startEdit(r)}
                        disabled={saving}
                      >
                        Edit
                      </GhostButton>
                      <GhostButton
                        className="text-error/90 border-error/30 py-1.5 text-xs"
                        type="button"
                        onClick={() => void removeId(r.id)}
                        disabled={saving}
                      >
                        Delete
                      </GhostButton>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </div>
    </div>
  );
}
