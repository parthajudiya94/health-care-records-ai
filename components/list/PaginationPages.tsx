"use client";

import { PAGE_SIZES, type PageSize } from "@/lib/pagination";
import { GhostButton } from "@/components/ui/GhostButton";

function clampPage(p: number, totalPages: number) {
  if (!Number.isFinite(p)) return 1;
  return Math.min(Math.max(1, Math.floor(p)), Math.max(1, totalPages));
}

function pageItems(current: number, totalPages: number) {
  const cur = clampPage(current, totalPages);
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const s = new Set<number>([1, 2, totalPages - 1, totalPages, cur - 1, cur, cur + 1]);
  const pages = Array.from(s)
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  const out: Array<number | "…"> = [];
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i]!;
    const prev = pages[i - 1];
    if (i > 0 && prev && p - prev > 1) out.push("…");
    out.push(p);
  }
  return out;
}

export function PaginationPages({
  page,
  pageSize,
  total,
  loading,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: PageSize;
  total: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
}) {
  const safeTotal = Number.isFinite(total) ? Math.max(0, total) : 0;
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 10;
  const totalPages = Math.max(1, Math.ceil(safeTotal / safePageSize));
  const cur = clampPage(page, totalPages);

  const items = pageItems(cur, totalPages);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-2">
      <div className="text-xs text-ink-muted">
        Page <span className="font-medium text-ink">{cur}</span> of{" "}
        <span className="font-medium text-ink">{totalPages}</span> ·{" "}
        <span className="font-medium text-ink">{safeTotal}</span> total
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <GhostButton
          type="button"
          onClick={() => onPageChange(Math.max(1, cur - 1))}
          disabled={loading || cur <= 1}
        >
          Prev
        </GhostButton>

        <div className="flex flex-wrap items-center gap-1">
          {items.map((it, idx) =>
            it === "…" ? (
              <span key={`e-${idx}`} className="px-2 text-xs text-ink-muted">
                …
              </span>
            ) : (
              <button
                key={it}
                type="button"
                disabled={loading}
                onClick={() => onPageChange(it)}
                className={[
                  "h-9 min-w-9 rounded-xl border px-3 text-xs font-medium shadow-sm transition",
                  it === cur
                    ? "border-brand/50 bg-brand/10 text-ink"
                    : "border-border bg-paper text-ink-muted hover:text-ink",
                  loading ? "opacity-60" : "",
                ].join(" ")}
              >
                {it}
              </button>
            ),
          )}
        </div>

        <GhostButton
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, cur + 1))}
          disabled={loading || cur >= totalPages}
        >
          Next
        </GhostButton>

        <label className="ml-1 flex items-center gap-2 text-xs text-ink-muted">
          <span>Rows</span>
          <select
            className="rounded-xl border border-border bg-paper px-2 py-1 text-xs text-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
            value={pageSize}
            disabled={loading}
            onChange={(e) => onPageSizeChange(Number(e.target.value) as PageSize)}
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

