import { RecordBrowser } from "@/components/admin/RecordBrowser";

export default function AdminRecordsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-ink">
          Records
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Browse records across all users and open record details.
        </p>
      </div>
      <RecordBrowser />
    </div>
  );
}

