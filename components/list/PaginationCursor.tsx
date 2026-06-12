"use client";

import { GhostButton } from "@/components/ui/GhostButton";

export function PaginationCursor({
  nextCursor,
  loading,
  onLoadMore,
}: {
  nextCursor: string | null;
  loading: boolean;
  onLoadMore: (cursor: string) => void;
}) {
  if (!nextCursor) return null;
  return (
    <div className="flex justify-center pt-2">
      <GhostButton
        type="button"
        onClick={() => onLoadMore(nextCursor)}
        disabled={loading}
      >
        {loading ? "…" : "Load more"}
      </GhostButton>
    </div>
  );
}

