import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Panel } from "@/components/ui/Panel";
import { STATUS_LABEL, type SummaryStatus } from "@/lib/summary-status";

type PageProps = { params: Promise<{ recordId: string }> };

export default async function AdminRecordDetailPage({ params }: PageProps) {
  const { recordId } = await params;

  const record = await prisma.record.findUnique({
    where: { id: recordId },
    include: {
      user: { select: { id: true, email: true, name: true } },
      files: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!record) notFound();

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        <Link className="text-ink hover:text-tint" href="/admin/records">
          Records
        </Link>{" "}
        <span aria-hidden>/</span> {record.title}
      </p>

      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-ink">
          {record.title}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Patient:{" "}
          <Link
            className="font-medium text-tint hover:underline"
            href={`/admin/users/${record.user.id}`}
          >
            {record.user.email}
          </Link>
        </p>
        {record.note ? (
          <p className="mt-2 text-sm text-ink-muted">{record.note}</p>
        ) : null}
      </div>

      <Panel className="p-4">
        <h2 className="text-sm font-semibold text-ink">Files</h2>
        {record.files.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">No files in this record.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {record.files.map((f) => (
              <li
                key={f.id}
                className="rounded-xl border border-border/60 bg-white/40 p-3"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-medium text-ink">
                      {f.fileName}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {f.mimeType} ·{" "}
                      {STATUS_LABEL[f.summaryStatus as SummaryStatus]}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      className="text-tint inline-flex items-center rounded-lg border border-border bg-white px-2 py-1.5 text-xs font-medium"
                      href={`/api/admin/files/${f.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Download
                    </a>
                    <Link
                      className="text-tint inline-flex items-center rounded-lg border border-border bg-white px-2 py-1.5 text-xs font-medium"
                      href={`/patient/records/${record.id}`}
                    >
                      Open in patient UI
                    </Link>
                  </div>
                </div>
                {f.summaryError ? (
                  <p className="mt-1 text-xs text-error">{f.summaryError}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

