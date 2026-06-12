import Link from "next/link";
import { getSessionUserFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Panel } from "@/components/ui/Panel";
import { ReminderType } from "@prisma/client";
import { redirect } from "next/navigation";
import { STATUS_LABEL, type SummaryStatus } from "@/lib/summary-status";

const DAY_MS = 86_400_000;
const TREND_DAYS = 14;

function ymdKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function typeLabel(t: ReminderType) {
  if (t === "APPOINTMENT") return "Appointment";
  if (t === "MEDICATION") return "Medication";
  if ((t as unknown as string) === "TEST") return "Test";
  return "Other";
}

function formatShortDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default async function DashboardPage() {
  const user = await getSessionUserFromCookies();
  if (!user) redirect("/login");

  const now = new Date();
  const in7d = new Date(now.getTime() + 7 * DAY_MS);
  const fromTrend = new Date(now.getTime() - TREND_DAYS * DAY_MS);

  const [
    recordCount,
    fileCount,
    statusGroups,
    reminderCount7d,
    weekReminders,
    recentRecords,
    trendSource,
  ] = await Promise.all([
    prisma.record.count({ where: { userId: user.id } }),
    prisma.recordFile.count({ where: { userId: user.id } }),
    prisma.recordFile.groupBy({
      by: ["summaryStatus"],
      where: { userId: user.id },
      _count: { _all: true },
    }),
    prisma.reminder.count({
      where: { userId: user.id, datetime: { gte: now, lte: in7d } },
    }),
    prisma.reminder.findMany({
      where: { userId: user.id, datetime: { gte: now, lte: in7d } },
      orderBy: { datetime: "asc" },
      take: 5,
    }),
    prisma.record.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { files: { take: 1, orderBy: { createdAt: "desc" } } },
    }),
    prisma.record.findMany({
      where: { userId: user.id, createdAt: { gte: fromTrend } },
      select: { createdAt: true },
    }),
  ]);

  const byDay: Record<string, number> = {};
  for (let i = 0; i < TREND_DAYS; i++) {
    const t = new Date(fromTrend.getTime() + i * DAY_MS);
    byDay[ymdKey(t)] = 0;
  }
  for (const r of trendSource) {
    const k = ymdKey(new Date(r.createdAt));
    if (k in byDay) byDay[k] = (byDay[k] ?? 0) + 1;
  }
  const trendDays = Object.entries(byDay);
  const maxN = Math.max(1, ...trendDays.map(([, n]) => n));

  const statusMap = new Map<SummaryStatus, number>();
  for (const s of statusGroups) {
    statusMap.set(s.summaryStatus as SummaryStatus, s._count._all);
  }

  type Wk = (typeof weekReminders)[number];
  type Rec = (typeof recentRecords)[number];

  return (
    <div className="mx-auto max-w-4xl p-4 md:px-8 md:pt-8 md:pb-12">
      <header className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-ink">
          Overview
        </h1>
        <p className="text-ink-muted mt-2 max-w-2xl text-sm leading-relaxed">
          A quick snapshot of your health records, AI summaries, and what is
          coming up. Summaries run only when you request them from Records.
        </p>
      </header>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Panel className="p-4">
          <p className="text-xs font-medium text-ink-muted">Records</p>
          <p className="font-[family-name:var(--font-display)] mt-1.5 text-2xl text-tint">
            {recordCount}
          </p>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs font-medium text-ink-muted">Files stored</p>
          <p className="font-[family-name:var(--font-display)] mt-1.5 text-2xl text-tint">
            {fileCount}
          </p>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs font-medium text-ink-muted">Summaries ready</p>
          <p className="font-[family-name:var(--font-display)] mt-1.5 text-2xl text-tint">
            {statusMap.get("READY") ?? 0}
          </p>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs font-medium text-ink-muted">Upcoming (7d)</p>
          <p className="font-[family-name:var(--font-display)] mt-1.5 text-2xl text-tint">
            {reminderCount7d}
          </p>
        </Panel>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel className="p-5">
          <h2 className="text-sm font-semibold text-ink">New records (trend)</h2>
          <p className="text-ink-muted text-xs">Last 14 days</p>
          <div
            className="mt-4 flex h-36 items-end justify-between gap-0.5 border-b border-border pt-1"
            role="img"
            aria-label="Bar trend of new records in the last 14 days"
          >
            {trendDays.map(([k, n]) => (
              <div key={k} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                <div
                  className="w-full rounded-t-sm bg-sage/70 transition-[height]"
                  style={{
                    height: `${Math.max(4, (n / maxN) * 100)}%`,
                    minHeight: n > 0 ? 8 : 2,
                  }}
                  title={`${k}: ${n} new`}
                />
              </div>
            ))}
          </div>
          <p className="text-ink-muted mt-1 text-center text-xs">
            Taller bars = more new records on that day
          </p>
        </Panel>

        <Panel className="p-5">
          <h2 className="text-sm font-semibold text-ink">Summary status (files)</h2>
          <p className="text-ink-muted text-xs">Across all your uploads</p>
          <ul className="text-ink-muted mt-3 space-y-1.5 text-sm">
            {(Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).map(
              (k) => (
                <li
                  key={k}
                  className="border-border/60 flex justify-between border-b border-dashed py-0.5 last:border-0"
                >
                  <span className="text-ink/90">{STATUS_LABEL[k]}</span>
                  <span className="text-tint font-medium text-ink">
                    {statusMap.get(k as SummaryStatus) ?? 0}
                  </span>
                </li>
              )
            )}
          </ul>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel className="p-5">
          <h2 className="text-sm font-semibold text-ink">Upcoming reminders</h2>
          {weekReminders.length === 0 ? (
            <p className="text-ink-muted py-2 text-sm">
              None in the next week. Add one on the{" "}
              <Link href="/patient/reminders" className="text-tint font-medium">
                Reminders
              </Link>{" "}
              page.
            </p>
          ) : (
            <ul className="mt-2 space-y-2.5" aria-label="Next reminders list">
              {weekReminders.map((r: Wk) => (
                <li
                  key={r.id}
                  className="border-border/50 flex items-start justify-between gap-2 border-b border-dashed py-0.5 last:border-0"
                >
                  <div>
                    <p className="text-sm text-ink">{r.title}</p>
                    <p className="text-ink-muted text-xs">
                      {typeLabel(r.type)} · {formatShortDate(r.datetime.toISOString())}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="pt-2">
            <Link className="text-tint text-sm font-medium" href="/patient/reminders">
              All reminders
            </Link>
          </p>
        </Panel>

        <Panel className="p-5">
          <h2 className="text-sm font-semibold text-ink">Recent activity</h2>
          {recentRecords.length === 0 ? (
            <p className="text-ink-muted py-2 text-sm">
              You have not created a record yet. Open{" "}
              <Link href="/patient/records" className="text-tint font-medium">
                Records
              </Link>{" "}
              to get started.
            </p>
          ) : (
            <ul className="mt-2 space-y-2" aria-label="Most recent records">
              {recentRecords.map((r: Rec) => {
                const f = r.files[0];
                return (
                  <li key={r.id}>
                    <Link
                      className="border-border/40 hover:bg-tint/5 -mx-1 block rounded-lg border border-transparent p-1 transition"
                      href={`/patient/records/${r.id}`}
                    >
                      <p className="text-ink line-clamp-1 text-sm font-medium">
                        {r.title}
                      </p>
                      {f ? (
                        <p className="text-ink-muted text-xs">
                          {STATUS_LABEL[f.summaryStatus as SummaryStatus]} · {f.fileName}
                        </p>
                      ) : (
                        <p className="text-ink-muted text-xs">No files yet</p>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="pt-2">
            <Link className="text-tint text-sm font-medium" href="/patient/records">
              Browse all records
            </Link>
          </p>
        </Panel>
      </div>

    </div>
  );
}

