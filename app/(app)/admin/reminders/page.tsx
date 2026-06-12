import { AdminRemindersClient } from "@/components/admin/AdminRemindersClient";

export default function AdminRemindersPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-ink">
          Reminders
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          View and manage reminders across all users.
        </p>
      </div>
      <AdminRemindersClient />
    </div>
  );
}

