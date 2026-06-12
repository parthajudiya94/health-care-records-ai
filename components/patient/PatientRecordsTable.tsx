"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DataTable, Td } from "@/components/list/DataTable";
import { ListToolbar } from "@/components/list/ListToolbar";
import { Panel } from "@/components/ui/Panel";
import { STATUS_LABEL, type SummaryStatus } from "@/lib/summary-status";
import { type PageSize } from "@/lib/pagination";

type Row = {
  id: string;
  title: string;
  note: string | null;
  createdAt: string;
  _count: { files: number };
  files: { fileName: string; summaryStatus: string }[];
};

export function PatientRecordsTable() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({
    reportType: "",
    riskLevel: "",
    fromDate: "",
    toDate: "",
  });
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);

  const q = query.trim();

  const load = useCallback(async (args: { page: number; pageSize: PageSize; query: string }) => {
    setLoading(true);
    setError(null);
    try {
      const u = new URL("/api/records", window.location.origin);
      if (args.query) u.searchParams.set("query", args.query);
      if (filters.reportType.trim()) u.searchParams.set("reportType", filters.reportType.trim());
      if (filters.riskLevel.trim()) u.searchParams.set("riskLevel", filters.riskLevel.trim());
      if (filters.fromDate.trim()) u.searchParams.set("fromDate", filters.fromDate.trim());
      if (filters.toDate.trim()) u.searchParams.set("toDate", filters.toDate.trim());
      u.searchParams.set("page", String(args.page));
      u.searchParams.set("pageSize", String(args.pageSize));
      const res = await fetch(u.toString(), { credentials: "include" });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        records?: Row[];
        total?: number;
      };
      if (!res.ok) {
        setError(data.error || "Could not load records");
        return;
      }
      setItems(data.records ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load({ page, pageSize, query: q });
  }, [page, pageSize, q, load]);

  return (
    <div className="space-y-4">
      <ListToolbar
        query={query}
        setQuery={(v) => {
          setQuery(v);
          setPage(1);
        }}
        onRefresh={() => void load({ page: 1, pageSize, query: q })}
        searchPlaceholder="Search title or note"
      />

      <Panel className="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium tracking-wide uppercase text-ink-muted" htmlFor="rf-type">
              Type
            </label>
            <input
              id="rf-type"
              className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-ink shadow-inner"
              placeholder='e.g. Labs, Imaging'
              value={filters.reportType}
              onChange={(e) => {
                setFilters((f) => ({ ...f, reportType: e.target.value }));
                setPage(1);
              }}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium tracking-wide uppercase text-ink-muted" htmlFor="rf-risk">
              Risk
            </label>
            <select
              id="rf-risk"
              className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-ink shadow-inner"
              value={filters.riskLevel}
              onChange={(e) => {
                setFilters((f) => ({ ...f, riskLevel: e.target.value }));
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium tracking-wide uppercase text-ink-muted" htmlFor="rf-from">
              From
            </label>
            <input
              id="rf-from"
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
            <label className="mb-1.5 block text-sm font-medium tracking-wide uppercase text-ink-muted" htmlFor="rf-to">
              To
            </label>
            <input
              id="rf-to"
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
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-2xl border border-border bg-white/50 px-4 py-2 text-sm font-medium text-ink hover:bg-white transition"
            onClick={() => {
              setFilters({ reportType: "", riskLevel: "", fromDate: "", toDate: "" });
              setPage(1);
            }}
            disabled={loading}
          >
            Clear filters
          </button>
        </div>
      </Panel>

      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      {items.length === 0 ? (
        <Panel className="p-8 text-center">
          <p className="text-ink text-sm">No records found.</p>
          <p className="text-ink-muted mt-2 text-sm">
            Create a record to start uploading documents or photos.
          </p>
          <Link
            className="text-tint mt-4 inline-block text-sm font-semibold"
            href="/patient/records/new"
          >
            Create a record
          </Link>
        </Panel>
      ) : (
        <DataTable
          headers={["Title", "Files", "Last file", "Actions"]}
          page={page}
          pageSize={pageSize}
          total={total}
          loading={loading}
          onPageChange={(p) => {
            setPage(p);
            void load({ page: p, pageSize, query: q });
          }}
          onPageSizeChange={(ps) => {
            setPageSize(ps);
            setPage(1);
            void load({ page: 1, pageSize: ps, query: q });
          }}
          minWidthClassName="min-w-[48rem]"
        >
          {items.map((r) => {
            const f = r.files[0];
            return (
              <tr key={r.id} className="hover:bg-paper/40">
                <Td>
                  <p className="font-medium text-ink">{r.title}</p>
                  {r.note ? (
                    <p className="text-xs text-ink-muted line-clamp-1">{r.note}</p>
                  ) : null}
                  <p className="text-xs text-ink-muted">{r.id}</p>
                </Td>
                <Td>
                  <p className="text-sm text-ink">
                    {r._count.files} file{r._count.files === 1 ? "" : "s"}
                  </p>
                </Td>
                <Td>
                  {f ? (
                    <p className="text-xs text-ink-muted">
                      {f.fileName} — {STATUS_LABEL[f.summaryStatus as SummaryStatus] ?? f.summaryStatus}
                    </p>
                  ) : (
                    <p className="text-xs text-ink-muted">No files yet</p>
                  )}
                </Td>
                <Td>
                  <Link
                    className="text-tint text-sm font-medium hover:underline"
                    href={`/patient/records/${r.id}`}
                  >
                    Open
                  </Link>
                </Td>
              </tr>
            );
          })}
        </DataTable>
      )}
    </div>
  );
}

