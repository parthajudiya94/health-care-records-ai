import type { ReactNode } from "react";
import { PaginationPages } from "@/components/list/PaginationPages";
import type { PageSize } from "@/lib/pagination";

export function DataTable({
  headers,
  children,
  page,
  pageSize,
  total,
  loading,
  onPageChange,
  onPageSizeChange,
  minWidthClassName = "min-w-[40rem]",
}: {
  headers: string[];
  children: ReactNode;
  page: number;
  pageSize: PageSize;
  total: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
  minWidthClassName?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-2xl border border-border bg-paper-elevated/70 shadow-sm">
        <table className={`w-full ${minWidthClassName} border-collapse text-left text-sm`}>
          <thead className="bg-paper/60">
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  className="border-border/60 border-b px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">{children}</tbody>
        </table>
      </div>
      <PaginationPages
        page={page}
        pageSize={pageSize}
        total={total}
        loading={loading}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}

export function Td({ children }: { children: ReactNode }) {
  return <td className="px-4 py-3 align-top">{children}</td>;
}

