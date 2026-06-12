"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { DataTable, Td } from "@/components/list/DataTable";
import { type PageSize } from "@/lib/pagination";

type Row = {
  id: string;
  createdAt: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
};

const PATIENT_ACTIONS: { v: string; l: string }[] = [
  { v: "", l: "All actions" },
  { v: "REGISTER", l: "Registered account" },
  { v: "LOGIN", l: "Signed in" },
  { v: "LOGOUT", l: "Signed out" },
  { v: "RECORD_CREATE", l: "Created record" },
  { v: "RECORD_FILE_UPLOAD", l: "Uploaded file" },
  { v: "AI_SUMMARY_REQUEST", l: "Requested AI summary" },
  { v: "REMINDER_CREATE", l: "Created reminder" },
  { v: "REMINDER_UPDATE", l: "Updated reminder" },
  { v: "REMINDER_DELETE", l: "Deleted reminder" },
];

const RESOURCE_TYPES: { v: string; l: string }[] = [
  { v: "", l: "All resources" },
  { v: "User", l: "Account" },
  { v: "Session", l: "Session" },
  { v: "Record", l: "Record" },
  { v: "RecordFile", l: "File" },
  { v: "Reminder", l: "Reminder" },
];

function labelForAction(a: string) {
  return PATIENT_ACTIONS.find((x) => x.v === a)?.l ?? a;
}

export function PatientAuditExplorer() {
  const [filters, setFilters] = useState({
    action: "",
    resourceType: "",
    fromDate: "",
    toDate: "",
  });
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);

  const qs = useMemo(() => {
    const u = new URL("/api/audit", window.location.origin);
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
          setError(data.error || "Could not load audit log");
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

  return (
    <div className="space-y-4">
      <Panel className="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium tracking-wide uppercase text-ink-muted" htmlFor="pa-action">
              Action
            </label>
            <select
              id="pa-action"
              className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-ink shadow-inner"
              value={filters.action}
              onChange={(e) => {
                setFilters((f) => ({ ...f, action: e.target.value }));
                setPage(1);
              }}
            >
              {PATIENT_ACTIONS.map((x) => (
                <option key={x.v || "_all"} value={x.v}>
                  {x.l}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium tracking-wide uppercase text-ink-muted" htmlFor="pa-resourceType">
              Resource
            </label>
            <select
              id="pa-resourceType"
              className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-ink shadow-inner"
              value={filters.resourceType}
              onChange={(e) => {
                setFilters((f) => ({ ...f, resourceType: e.target.value }));
                setPage(1);
              }}
            >
              {RESOURCE_TYPES.map((x) => (
                <option key={x.v || "_all"} value={x.v}>
                  {x.l}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium tracking-wide uppercase text-ink-muted" htmlFor="pa-from">
              From
            </label>
            <input
              id="pa-from"
              type="date"
              className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-ink shadow-inner"
              value={filters.fromDate}
              onChange={(e) => {
                setFilters((f) => ({ ...f, fromDate: e.target.value }));
                setPage(1);
              }}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium tracking-wide uppercase text-ink-muted" htmlFor="pa-to">
              To
            </label>
            <input
              id="pa-to"
              type="date"
              className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-ink shadow-inner"
              value={filters.toDate}
              onChange={(e) => {
                setFilters((f) => ({ ...f, toDate: e.target.value }));
                setPage(1);
              }}
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-2xl border border-border bg-white/50 px-4 py-2 text-sm font-medium text-ink hover:bg-white transition disabled:opacity-50"
            onClick={() => {
              setPage(1);
              void load({ page: 1, pageSize, qs: qs.toString() });
            }}
            disabled={loading}
          >
            Apply filters
          </button>
          <p className="text-xs text-ink-muted">
            Times are shown in your local timezone.
          </p>
        </div>
      </Panel>

      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      <DataTable
        headers={["Time", "Action", "Resource", "IDs"]}
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
              <p className="font-medium text-ink">{labelForAction(r.action)}</p>
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

