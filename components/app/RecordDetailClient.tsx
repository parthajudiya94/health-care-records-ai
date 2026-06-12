"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { GhostButton } from "@/components/ui/GhostButton";
import { FileViewerModal } from "@/components/app/FileViewerModal";
import type { HealthSummary } from "@/lib/ai";
import type { Prisma } from "@prisma/client";
import type { SummaryStatus } from "@/lib/summary-status";

type FileRow = {
  id: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
  summaryStatus: SummaryStatus;
  summaryError: string | null;
  summarizedAt: string | null;
  summary: Prisma.JsonValue;
};

export type RecordDetailDto = {
  id: string;
  title: string;
  note: string | null;
  createdAt: string;
  files: FileRow[];
};

const STATUS_LABEL: Record<SummaryStatus, string> = {
  NOT_REQUESTED: "Not summarized",
  PROCESSING: "Processing",
  READY: "Ready",
  ERROR: "Error",
};

function isHealthSummary(s: unknown): s is HealthSummary {
  if (!s || typeof s !== "object") return false;
  return "plainLanguageSummary" in s;
}

export function RecordDetailClient({ initial }: { initial: RecordDetailDto }) {
  const router = useRouter();
  const [record, setRecord] = useState<RecordDetailDto>(initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openSummaryId, setOpenSummaryId] = useState<string | null>(null);
  const [batching, setBatching] = useState(false);
  const [viewFile, setViewFile] = useState<{ id: string; fileName: string; mimeType: string } | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/records/${record.id}`, { credentials: "include" });
    if (!res.ok) return;
    const data = (await res.json()) as { record: RecordDetailDto };
    setRecord(data.record);
  }, [record.id]);

  async function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    if (!list?.length) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of list) {
        const fd = new FormData();
        fd.set("file", file);
        const res = await fetch(`/api/records/${record.id}/files`, {
          method: "POST",
          body: fd,
          credentials: "include",
        });
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setError(j.error || "Upload failed");
        }
      }
      await refresh();
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function summarizeFile(fileId: string) {
    setError(null);
    setBusyId(fileId);
    try {
      const res = await fetch(`/api/records/files/${fileId}/summarize`, {
        method: "POST",
        credentials: "include",
      });
      await res.json().catch(() => ({}));
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function summarizeAll() {
    setError(null);
    setBatching(true);
    try {
      const res = await fetch(`/api/records/${record.id}/summarize-all`, {
        method: "POST",
        credentials: "include",
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(j.error || "Batch summarize failed");
        return;
      }
      await refresh();
    } finally {
      setBatching(false);
    }
  }

  const eligibleForAll = record.files.filter(
    (f) => f.summaryStatus === "NOT_REQUESTED" || f.summaryStatus === "ERROR"
  );

  return (
    <div className="text-ink space-y-4">
      <p className="text-ink-muted text-sm">
        <Link
          className="text-ink hover:text-tint"
          href="/patient/records"
        >
          Records
        </Link>
        <span className="text-ink-muted" aria-hidden>
          {" "}
          /{" "}
        </span>
        {record.title}
      </p>

      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-ink">
          {record.title}
        </h1>
        {record.note ? (
          <p className="text-ink-muted mt-2 text-sm leading-relaxed">{record.note}</p>
        ) : null}
        <p className="text-ink-muted text-xs">
          Created{" "}
          {new Date(record.createdAt).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      </div>

      <div className="border-border/60 flex flex-wrap items-center gap-2 border-b border-dashed py-1">
        <span className="text-ink text-sm">Add files</span>
        <input
          type="file"
          className="text-ink max-w-[min(100%,18rem)] text-sm file:mr-2 file:cursor-pointer file:rounded-lg file:border-0 file:bg-tint file:px-2 file:py-1.5 file:text-sm file:font-medium file:text-white"
          onChange={onPickFiles}
          accept=".pdf,.txt,.text,.md,.json,.xml,.heic,.heif,.heics,.heifs,.heif-sequence,image/*"
          multiple
          disabled={uploading}
        />
        {uploading ? (
          <span className="text-ink-muted text-xs">Uploading…</span>
        ) : null}
        {eligibleForAll.length > 0 ? (
          <PrimaryButton
            type="button"
            onClick={summarizeAll}
            disabled={batching}
            className="py-2 text-sm"
          >
            {batching ? "Working…" : "Summarize all outstanding"}
          </PrimaryButton>
        ) : null}
      </div>

      {error ? (
        <p className="text-error text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {record.files.length === 0 ? (
        <Panel className="p-5 text-sm text-ink-muted">
          No files yet. Choose files above to attach PDF, text, or an image. AI is not used until
          you click Summarize.
        </Panel>
      ) : (
        <ul className="space-y-3" aria-label="Files in this record">
          {record.files.map((f) => {
            const open = openSummaryId === f.id;
            const summary = f.summary;
            const canSummarize =
              f.summaryStatus === "NOT_REQUESTED" || f.summaryStatus === "ERROR";
            const isBusy = busyId === f.id;

            return (
              <li key={f.id}>
                <Panel className="p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-ink line-clamp-1 text-sm font-medium" title={f.fileName}>
                        {f.fileName}
                      </p>
                      <p className="text-ink-muted text-xs">
                        {f.mimeType} — {STATUS_LABEL[f.summaryStatus]}
                        {f.summarizedAt
                          ? ` — ${new Date(f.summarizedAt).toLocaleString()}`
                          : null}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <GhostButton
                        type="button"
                        className="py-1.5 text-xs"
                        onClick={() =>
                          setViewFile({ id: f.id, fileName: f.fileName, mimeType: f.mimeType })
                        }
                      >
                        View
                      </GhostButton>
                      <a
                        className="text-tint inline-flex items-center rounded-lg border border-border bg-white px-2 py-1.5 text-xs font-medium"
                        href={`/api/records/files/${f.id}/file`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Download
                      </a>
                      {canSummarize ? (
                        <PrimaryButton
                          className="py-1.5 text-xs"
                          type="button"
                          disabled={isBusy || f.summaryStatus === "PROCESSING"}
                          onClick={() => summarizeFile(f.id)}
                        >
                          {f.summaryStatus === "PROCESSING" || isBusy
                            ? "…"
                            : "Summarize"}
                        </PrimaryButton>
                      ) : f.summaryStatus === "READY" && isHealthSummary(summary) ? (
                        <GhostButton
                          type="button"
                          onClick={() => setOpenSummaryId(open ? null : f.id)}
                          className="py-1.5 text-xs"
                        >
                          {open ? "Hide" : "Show"} summary
                        </GhostButton>
                      ) : null}
                    </div>
                  </div>
                  {f.summaryError ? (
                    <p className="text-error text-xs" role="alert">
                      {f.summaryError}
                    </p>
                  ) : null}
                  {open && isHealthSummary(summary) ? (
                    <div className="text-ink mt-3 space-y-2 pl-0 text-sm sm:border-l-2 sm:border-sage/40 sm:pl-3">
                      <p className="text-ink/90 font-medium">Plain summary</p>
                      <p className="leading-relaxed text-ink-muted">
                        {summary.plainLanguageSummary}
                      </p>
                      {summary.keyFindings.length > 0 ? (
                        <div>
                          <p className="text-ink/90 text-xs font-medium">Key findings</p>
                          <ul className="text-ink-muted mt-0.5 list-inside list-disc text-xs">
                            {summary.keyFindings.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {summary.suggestedNextSteps.length > 0 ? (
                        <div>
                          <p className="text-ink/90 text-xs font-medium">Suggested next steps</p>
                          <ul className="text-ink-muted mt-0.5 list-inside list-disc text-xs">
                            {summary.suggestedNextSteps.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      <p className="text-ink-muted/90 text-xs">{summary.disclaimer}</p>
                    </div>
                  ) : null}
                </Panel>
              </li>
            );
          })}
        </ul>
      )}

      <FileViewerModal open={!!viewFile} onClose={() => setViewFile(null)} file={viewFile} />

      <p className="pt-1">
        <button
          type="button"
          className="text-ink-muted text-sm hover:text-tint"
          onClick={() => router.push("/patient/records")}
        >
          ← Back to records
        </button>
      </p>
    </div>
  );
}
