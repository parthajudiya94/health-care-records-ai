"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { DataTable, Td } from "@/components/list/DataTable";
import type { PageSize } from "@/lib/pagination";

type SessionRow = {
  id: string;
  createdAt: string;
  lastMessageAt: string;
  lastMessagePreview: string;
  messageCount: number;
};

export function ChatHistoryClient() {
  const [items, setItems] = useState<SessionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (nextPage: number, nextPageSize: PageSize) => {
    setLoading(true);
    try {
      const u = new URL("/api/ai/chat/sessions", window.location.origin);
      u.searchParams.set("page", String(nextPage));
      u.searchParams.set("pageSize", String(nextPageSize));
      const res = await fetch(u.toString(), { credentials: "include" });
      const data = (await res.json().catch(() => ({}))) as {
        items?: SessionRow[];
        total?: number;
        page?: number;
        pageSize?: PageSize;
      };
      if (!res.ok) return;
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data.total ?? 0) || 0);
      setPage(Number(data.page ?? nextPage) || nextPage);
      setPageSize((data.pageSize ?? nextPageSize) as PageSize);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(page, pageSize);
  }, [load, page, pageSize]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">Chat history</h1>
        <p className="text-sm text-ink-muted">Browse your previous conversations with the assistant.</p>
      </div>

      <Panel className="p-5">
        <DataTable
          headers={["Started", "Last message", "Messages", ""]}
          page={page}
          pageSize={pageSize}
          total={total}
          loading={loading}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(s) => {
            setPage(1);
            setPageSize(s);
          }}
          minWidthClassName="min-w-[44rem]"
        >
          {items.length ? (
            items.map((s) => (
              <tr key={s.id}>
                <Td>
                  <div className="text-sm font-medium text-ink">
                    {new Date(s.createdAt).toLocaleString()}
                  </div>
                </Td>
                <Td>
                  <div className="text-sm text-ink">{s.lastMessagePreview || "—"}</div>
                  <div className="mt-1 text-xs text-ink-muted">
                    {new Date(s.lastMessageAt).toLocaleString()}
                  </div>
                </Td>
                <Td>
                  <span className="text-sm text-ink">{s.messageCount}</span>
                </Td>
                <Td>
                  <Link
                    href={`/patient/chat-history/${encodeURIComponent(s.id)}`}
                    className="inline-flex rounded-xl border border-border bg-paper px-3 py-1.5 text-xs font-medium text-ink-muted hover:text-ink hover:bg-white/60 transition"
                  >
                    Open
                  </Link>
                </Td>
              </tr>
            ))
          ) : (
            <tr>
              <Td>
                <span className="text-sm text-ink-muted">{loading ? "Loading…" : "No chats yet."}</span>
              </Td>
              <Td>{null}</Td>
              <Td>{null}</Td>
              <Td>{null}</Td>
            </tr>
          )}
        </DataTable>
      </Panel>
    </div>
  );
}

