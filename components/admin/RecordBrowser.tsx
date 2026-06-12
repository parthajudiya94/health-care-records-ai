"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DataTable, Td } from "@/components/list/DataTable";
import { ListToolbar } from "@/components/list/ListToolbar";
import { type PageSize } from "@/lib/pagination";

type Row = {
  id: string;
  title: string;
  note: string | null;
  createdAt: string;
  user: { id: string; email: string };
  _count: { files: number };
};

export function RecordBrowser({
  initialQuery = "",
}: {
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);

  const q = query.trim();

  const load = useCallback(
    async (args: { page: number; pageSize: PageSize; query: string }) => {
      setLoading(true);
      setError(null);
      try {
        const u = new URL("/api/admin/records", window.location.origin);
        if (args.query) u.searchParams.set("query", args.query);
        u.searchParams.set("page", String(args.page));
        u.searchParams.set("pageSize", String(args.pageSize));
        const res = await fetch(u.toString(), { credentials: "include" });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          items?: Row[];
          total?: number;
        };
        if (!res.ok) {
          setError(data.error || "Could not load records");
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
        searchPlaceholder="Search by record title or user email"
      />

      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      <DataTable
        headers={["Title", "User", "Files", "Created", "Actions"]}
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
      >
        {items.map((r) => (
          <tr key={r.id} className="hover:bg-paper/40">
            <Td>
              <p className="font-medium text-ink">{r.title}</p>
              {r.note ? <p className="text-xs text-ink-muted line-clamp-1">{r.note}</p> : null}
              <p className="text-xs text-ink-muted">{r.id}</p>
            </Td>
            <Td>
              <p className="text-sm text-ink">{r.user.email}</p>
              <p className="text-xs text-ink-muted">{r.user.id}</p>
            </Td>
            <Td>
              <p className="text-sm text-ink">{r._count.files}</p>
            </Td>
            <Td>
              <p className="text-xs text-ink-muted">
                {new Date(r.createdAt).toLocaleString(undefined, { dateStyle: "medium" })}
              </p>
            </Td>
            <Td>
              <Link className="text-tint text-sm font-medium hover:underline" href={`/admin/records/${r.id}`}>
                Open
              </Link>
            </Td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

