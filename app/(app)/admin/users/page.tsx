import { UserEditor } from "@/components/admin/UserEditor";

export default function AdminUsersPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-ink">
          Users
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Search, create, and manage patient/admin accounts.
        </p>
      </div>
      <UserEditor />
    </div>
  );
}

