import { AuditExplorer } from "@/components/admin/AuditExplorer";

export default function AdminAuditPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-ink">
          Audit
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Search audit events and export filtered results.
        </p>
      </div>
      <AuditExplorer />
    </div>
  );
}

