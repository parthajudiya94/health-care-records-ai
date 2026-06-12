export const PAGE_SIZES = [10, 25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export function parsePage(v: string | null | undefined): number {
  const n = Number(v ?? "1");
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.floor(n));
}

export function parsePageSize(v: string | null | undefined): PageSize {
  const n = Number(v ?? "10");
  const size = (Number.isFinite(n) ? Math.floor(n) : 10) as number;
  if (PAGE_SIZES.includes(size as PageSize)) return size as PageSize;
  return 10;
}

export function skipFor(page: number, pageSize: number) {
  return (Math.max(1, page) - 1) * pageSize;
}

