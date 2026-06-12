"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { Field } from "@/components/ui/Field";
import { GhostButton } from "@/components/ui/GhostButton";
import { DataTable, Td } from "@/components/list/DataTable";
import { type PageSize } from "@/lib/pagination";

type Row = {
  id: string;
  createdAt: string;
  action: string;
  userId: string;
  resourceType: string | null;
  resourceId: string | null;
  user?: { id: string; email: string } | null;
};

export function AuditExplorer({
  initial,
}: {
  initial?: Partial<{
    action: string;
    userId: string;
    resourceType: string;
    resourceId: string;
  }>;
}) {
  const [filters, setFilters] = useState({
    action: initial?.action ?? "",
    userId: initial?.userId ?? "",
    resourceType: initial?.resourceType ?? "",
    resourceId: initial?.resourceId ?? "",
    from: "",
    to: "",
  });
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);

  const qs = useMemo(() => {
    const u = new URL("/api/admin/audit", window.location.origin);
    for (const [k, v] of Object.entries(filters)) {
      if (v.trim()) u.searchParams.set(k, v.trim());
    }
    return u;
  }, [filters]);

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
          setError(data.error || "Could not load audit events");
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

  const exportHref = useMemo(() => {
    const u = new URL("/api/admin/audit/export", window.location.origin);
    for (const [k, v] of Object.entries(filters)) {
      if (v.trim()) u.searchParams.set(k, v.trim());
    }
    return u.pathname + u.search;
  }, [filters]);

  return (
    <div className="space-y-4">
      <Panel className="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field
            id="a-action"
            label="Action"
            value={filters.action}
            onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
            placeholder="e.g. LOGIN, ADMIN_FILE_DOWNLOAD"
          />
          <Field
            id="a-userId"
            label="UserId"
            value={filters.userId}
            onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value }))}
            placeholder="Filter by actor userId"
          />
          <Field
            id="a-resourceType"
            label="Resource type"
            value={filters.resourceType}
            onChange={(e) => setFilters((f) => ({ ...f, resourceType: e.target.value }))}
            placeholder="e.g. RecordFile, User"
          />
          <Field
            id="a-resourceId"
            label="Resource id"
            value={filters.resourceId}
            onChange={(e) => setFilters((f) => ({ ...f, resourceId: e.target.value }))}
            placeholder="Exact resource id"
          />
          <div>
            <label
              className="mb-1.5 block text-sm font-medium tracking-wide uppercase text-ink-muted"
              htmlFor="a-from"
            >
              From (ISO)
            </label>
            <input
              id="a-from"
              className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-ink shadow-inner"
              placeholder="2026-01-01T00:00:00.000Z"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            />
          </div>
          <div>
            <label
              className="mb-1.5 block text-sm font-medium tracking-wide uppercase text-ink-muted"
              htmlFor="a-to"
            >
              To (ISO)
            </label>
            <input
              id="a-to"
              className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-ink shadow-inner"
              placeholder="2026-01-31T23:59:59.999Z"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <GhostButton
              type="button"
              onClick={() => {
                setPage(1);
                void load({ page: 1, pageSize, qs: qs.toString() });
              }}
              disabled={loading}
            >
              Apply filters
            </GhostButton>
            <a
              className="inline-flex items-center justify-center rounded-2xl border border-border bg-white/50 px-4 py-2 text-sm font-medium text-ink hover:bg-white transition"
              href={exportHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              Export CSV
            </a>
          </div>
          <p className="text-xs text-ink-muted">
            Export includes current filters (max 5000 rows).
          </p>
        </div>
      </Panel>

      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      <DataTable
        headers={["Time", "Action", "Actor", "Resource", "IDs"]}
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
              <p className="text-xs text-ink-muted">
                {new Date(r.createdAt).toLocaleString()}
              </p>
            </Td>
            <Td>
              <p className="font-medium text-ink">{r.action}</p>
            </Td>
            <Td>
              <p className="text-sm text-ink">{r.user?.email ?? "—"}</p>
              <p className="text-xs text-ink-muted">{r.userId}</p>
            </Td>
            <Td>
              <p className="text-sm text-ink">{r.resourceType ?? "—"}</p>
              <p className="text-xs text-ink-muted">{r.resourceId ?? ""}</p>
            </Td>
            <Td>
              <p className="text-xs text-ink-muted">{r.id}</p>
            </Td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

