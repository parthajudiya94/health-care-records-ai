import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Panel } from "@/components/ui/Panel";
import { Stack } from "@/components/ui/Stack";

type PageProps = { params: Promise<{ userId: string }> };

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  if (!user) notFound();

  const [recordCount, reminderCount, auditCount] = await Promise.all([
    prisma.record.count({ where: { userId: user.id } }),
    prisma.reminder.count({ where: { userId: user.id } }),
    prisma.auditLog.count({ where: { userId: user.id } }),
  ]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        <Link className="text-ink hover:text-tint" href="/admin/users">
          Users
        </Link>{" "}
        <span aria-hidden>/</span> {user.email}
      </p>

      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-ink">
          {user.name}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{user.email}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Panel className="p-4">
          <p className="text-xs font-medium text-ink-muted">Role</p>
          <p className="mt-1 text-sm font-semibold text-ink">{user.role}</p>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs font-medium text-ink-muted">Records</p>
          <p className="mt-1 text-sm font-semibold text-ink">{recordCount}</p>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs font-medium text-ink-muted">Reminders</p>
          <p className="mt-1 text-sm font-semibold text-ink">{reminderCount}</p>
        </Panel>
      </div>

      <Panel className="p-5">
        <Stack gap="gap-2">
          <p className="text-sm text-ink-muted">
            Management actions (edit role/name, reset password) will be wired
            here next.
          </p>
          <p className="text-xs text-ink-muted">
            Audit events for this user:{" "}
            <span className="font-medium text-ink">{auditCount}</span>
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link
              className="text-sm font-medium text-tint hover:underline"
              href={`/admin/records?query=${encodeURIComponent(user.email)}`}
            >
              Search their records
            </Link>
            <Link
              className="text-sm font-medium text-tint hover:underline"
              href={`/admin/audit?userId=${encodeURIComponent(user.id)}`}
            >
              View their audit events
            </Link>
          </div>
        </Stack>
      </Panel>
    </div>
  );
}

