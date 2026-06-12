import Link from "next/link";
import { Panel } from "@/components/ui/Panel";

export default async function AdminDashboardPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-ink">
          Admin dashboard
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          System-wide overview across all patients. Full access in this MVP;
          audit logging will track admin actions.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Panel className="p-4">
          <p className="text-xs font-medium text-ink-muted">Users</p>
          <p className="mt-1.5 font-[family-name:var(--font-display)] text-2xl text-tint">
            —
          </p>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs font-medium text-ink-muted">Records</p>
          <p className="mt-1.5 font-[family-name:var(--font-display)] text-2xl text-tint">
            —
          </p>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs font-medium text-ink-muted">Files</p>
          <p className="mt-1.5 font-[family-name:var(--font-display)] text-2xl text-tint">
            —
          </p>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs font-medium text-ink-muted">Audit events</p>
          <p className="mt-1.5 font-[family-name:var(--font-display)] text-2xl text-tint">
            —
          </p>
        </Panel>
      </div>

      <Panel className="p-5">
        <p className="text-sm text-ink-muted">
          Next: implement{" "}
          <Link className="font-medium text-tint" href="/admin/users">
            Users
          </Link>
          ,{" "}
          <Link className="font-medium text-tint" href="/admin/records">
            Records
          </Link>
          ,{" "}
          <Link className="font-medium text-tint" href="/admin/audit">
            Audit
          </Link>
          , and{" "}
          <Link className="font-medium text-tint" href="/admin/reminders">
            Reminders
          </Link>
          .
        </p>
      </Panel>
    </div>
  );
}

