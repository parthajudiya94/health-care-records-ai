import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const [users, records, files, reminders, audits, summariesByStatus, recentAudits] =
    await Promise.all([
      prisma.user.count(),
      prisma.record.count(),
      prisma.recordFile.count(),
      prisma.reminder.count(),
      prisma.auditLog.count(),
      prisma.recordFile.groupBy({
        by: ["summaryStatus"],
        _count: { _all: true },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 12,
        include: { user: { select: { id: true, email: true } } },
      }),
    ]);

  const summaryStatusCounts = Object.fromEntries(
    summariesByStatus.map((g) => [g.summaryStatus, g._count._all])
  );

  return NextResponse.json({
    stats: {
      users,
      records,
      files,
      reminders,
      audits,
      summaryStatusCounts,
    },
    recentAudits,
  });
}

