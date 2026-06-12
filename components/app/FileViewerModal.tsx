"use client";

import { useEffect, useMemo, useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { GhostButton } from "@/components/ui/GhostButton";
import { X } from "lucide-react";

type FileRef = {
  id: string;
  fileName: string;
  mimeType: string;
};

function isPdf(m: string) {
  return m === "application/pdf" || m.endsWith("/pdf");
}

function isImage(m: string) {
  return m.startsWith("image/");
}

function isTextLike(m: string) {
  return (
    m.startsWith("text/") ||
    m === "application/json" ||
    m === "application/xml" ||
    m === "application/xhtml+xml"
  );
}

export function FileViewerModal({
  open,
  onClose,
  file,
}: {
  open: boolean;
  onClose: () => void;
  file: FileRef | null;
}) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inlineUrl = useMemo(() => {
    if (!file) return "";
    return `/api/records/files/${file.id}/file?disposition=inline`;
  }, [file]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !file) return;
    setError(null);
    setText(null);
    if (!isTextLike(file.mimeType)) return;
    let cancelled = false;
    async function loadText() {
      try {
        const res = await fetch(inlineUrl, { credentials: "include" });
        if (!res.ok) {
          if (!cancelled) setError("Could not load preview.");
          return;
        }
        const t = await res.text();
        if (!cancelled) setText(t);
      } catch {
        if (!cancelled) setError("Could not load preview.");
      }
    }
    void loadText();
    return () => {
      cancelled = true;
    };
  }, [open, file, inlineUrl]);

  if (!open || !file) return null;

  const canPreview = isPdf(file.mimeType) || isImage(file.mimeType) || isTextLike(file.mimeType);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
        aria-label="Close preview"
        onClick={onClose}
      />

      <Panel className="relative w-[min(64rem,calc(100vw-2rem))] overflow-hidden p-0 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border/60 bg-paper/60 p-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink" title={file.fileName}>
              {file.fileName}
            </p>
            <p className="truncate text-xs text-ink-muted">{file.mimeType}</p>
          </div>
          <GhostButton type="button" className="h-9 w-9 rounded-xl px-0" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden />
          </GhostButton>
        </div>

        <div className="bg-paper-elevated/30 h-[min(70vh,44rem)] w-full">
          {!canPreview ? (
            <div className="flex h-full items-center justify-center p-6 text-center">
              <div>
                <p className="text-sm font-medium text-ink">Preview not supported</p>
                <p className="mt-1 text-sm text-ink-muted">
                  Please download this file to view it.
                </p>
              </div>
            </div>
          ) : isPdf(file.mimeType) ? (
            <iframe className="h-full w-full" src={inlineUrl} title={file.fileName} />
          ) : isImage(file.mimeType) ? (
            <div className="flex h-full w-full items-center justify-center p-3">
              <img
                src={inlineUrl}
                alt={file.fileName}
                className="max-h-full max-w-full rounded-xl object-contain"
              />
            </div>
          ) : (
            <div className="h-full overflow-auto p-4">
              {error ? (
                <p className="text-sm text-error">{error}</p>
              ) : text == null ? (
                <p className="text-sm text-ink-muted">Loading…</p>
              ) : (
                <pre className="whitespace-pre-wrap break-words text-xs text-ink">
                  {text}
                </pre>
              )}
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

