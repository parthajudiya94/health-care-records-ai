import { PatientAuditExplorer } from "@/components/patient/PatientAuditExplorer";

export default function PatientAuditPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-ink">
          Audit log
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Activity history for your account (sign-ins, uploads, summaries, and reminders).
        </p>
      </div>
      <PatientAuditExplorer />
    </div>
  );
}

