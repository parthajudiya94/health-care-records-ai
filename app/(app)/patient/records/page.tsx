import Link from "next/link";
import { PatientRecordsTable } from "@/components/patient/PatientRecordsTable";

const newRecordBtnClass =
  "inline-flex items-center justify-center rounded-2xl bg-tint px-5 py-2.5 " +
  "text-sm font-semibold text-white transition hover:bg-tint-bright " +
  "active:scale-[0.99]";

export default function RecordsListPage() {
  return (
    <div className="space-y-4">
      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-ink">
            Records
          </h1>
          <p className="text-ink-muted mt-1 text-sm">
            Create a record, then add files. Summaries run when you ask for them.
          </p>
        </div>
        <Link href="/patient/records/new" className={newRecordBtnClass}>
          New record
        </Link>
      </div>

      <PatientRecordsTable />
    </div>
  );
}

