"use client";

import { Field } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { GhostButton } from "@/components/ui/GhostButton";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

export function ListToolbar({
  searchLabel = "Search",
  searchPlaceholder,
  query,
  setQuery,
  onRefresh,
  primaryLabel,
  onPrimary,
  primaryOpen,
}: {
  searchLabel?: string;
  searchPlaceholder?: string;
  query: string;
  setQuery: (v: string) => void;
  onRefresh: () => void;
  primaryLabel?: string;
  onPrimary?: () => void;
  primaryOpen?: boolean;
}) {
  return (
    <Panel className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <Field
            id="list-q"
            label={searchLabel}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <GhostButton type="button" onClick={onRefresh}>
            Refresh
          </GhostButton>
          {primaryLabel && onPrimary ? (
            <PrimaryButton type="button" onClick={onPrimary}>
              {primaryOpen ? "Close" : primaryLabel}
            </PrimaryButton>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}

