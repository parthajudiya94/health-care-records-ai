"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable, Td } from "@/components/list/DataTable";
import { GhostButton } from "@/components/ui/GhostButton";
import { type PageSize } from "@/lib/pagination";

type Row = {
  id: string;
  kind: string;
  title: string;
  readAt: string | null;
  createdAt: string;
};

function fmt(dt: string) {
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return dt;
  }
}

export function PatientNotificationsInbox() {
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async (args: { page: number; pageSize: PageSize }) => {
    setLoading(true);
    setError(null);
    try {
      const u = new URL("/api/notifications", window.location.origin);
      u.searchParams.set("page", String(args.page));
      u.searchParams.set("pageSize", String(args.pageSize));
      const res = await fetch(u.toString(), { credentials: "include" });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        items?: Row[];
        total?: number;
        unreadTotal?: number;
      };
      if (!res.ok) {
        setError(data.error || "Could not load notifications");
        return;
      }
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
      setUnreadTotal(data.unreadTotal ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load({ page, pageSize });
  }, [page, pageSize, load]);

  const unreadIds = useMemo(() => items.filter((x) => !x.readAt).map((x) => x.id), [items]);

  const markAllRead = useCallback(async () => {
    if (marking) return;
    setMarking(true);
    setError(null);
    try {
      const res = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ all: true }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(j.error || "Could not mark as read");
        return;
      }
      await load({ page, pageSize });
    } finally {
      setMarking(false);
    }
  }, [load, marking, page, pageSize]);

  const markPageUnreadRead = useCallback(async () => {
    if (marking) return;
    if (unreadIds.length === 0) return;
    setMarking(true);
    setError(null);
    try {
      const res = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: unreadIds }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(j.error || "Could not mark as read");
        return;
      }
      await load({ page, pageSize });
    } finally {
      setMarking(false);
    }
  }, [load, marking, page, pageSize, unreadIds]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-ink-muted">
          Unread: <span className="font-medium text-ink">{unreadTotal}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <GhostButton type="button" disabled={loading} onClick={() => void load({ page, pageSize })}>
            Refresh
          </GhostButton>
          <GhostButton type="button" disabled={marking || unreadIds.length === 0} onClick={() => void markPageUnreadRead()}>
            Mark page unread read
          </GhostButton>
          <GhostButton type="button" disabled={marking || unreadTotal === 0} onClick={() => void markAllRead()}>
            Mark all read
          </GhostButton>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      <DataTable
        headers={["Time", "Title", "Status"]}
        page={page}
        pageSize={pageSize}
        total={total}
        loading={loading}
        onPageChange={(p) => setPage(p)}
        onPageSizeChange={(ps) => {
          setPageSize(ps);
          setPage(1);
        }}
        minWidthClassName="min-w-[40rem]"
      >
        {items.map((n) => (
          <tr key={n.id} className="hover:bg-paper/40">
            <Td>
              <p className="text-xs text-ink-muted">{fmt(n.createdAt)}</p>
            </Td>
            <Td>
              <p className="text-sm text-ink">{n.title}</p>
              <p className="text-xs text-ink-muted">{n.kind}</p>
            </Td>
            <Td>
              {n.readAt ? (
                <span className="inline-flex rounded-full border border-border bg-white/60 px-2 py-0.5 text-xs font-medium text-ink-muted">
                  Read
                </span>
              ) : (
                <span className="inline-flex rounded-full border border-tint/40 bg-tint/10 px-2 py-0.5 text-xs font-semibold text-ink">
                  Unread
                </span>
              )}
            </Td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

