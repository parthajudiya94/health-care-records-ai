import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserFromCookies } from "@/lib/auth";
import { AuditAction } from "@/lib/audit";
import { parsePage, parsePageSize, skipFor } from "@/lib/pagination";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function clampTake(v: string | null, def: number) {
  const n = Number(v ?? String(def));
  if (!Number.isFinite(n)) return def;
  return Math.min(100, Math.max(10, Math.floor(n)));
}

const PATIENT_ACTIONS = [
  AuditAction.REGISTER,
  AuditAction.LOGIN,
  AuditAction.LOGOUT,
  AuditAction.RECORD_CREATE,
  AuditAction.RECORD_FILE_UPLOAD,
  AuditAction.AI_SUMMARY_REQUEST,
  AuditAction.REMINDER_CREATE,
  AuditAction.REMINDER_UPDATE,
  AuditAction.REMINDER_DELETE,
] as const;

type PatientAction = (typeof PATIENT_ACTIONS)[number];

function isPatientAction(a: string): a is PatientAction {
  return (PATIENT_ACTIONS as readonly string[]).includes(a);
}

function parseDateOnly(d: string): Date | null {
  // Expect YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  // Interpret in UTC for consistency across clients.
  const dt = new Date(`${d}T00:00:00.000Z`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export async function GET(request: Request) {
  const user = await getSessionUserFromCookies();
  if (!user) return jsonError("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const page = parsePage(searchParams.get("page"));
  const pageSize = parsePageSize(searchParams.get("pageSize"));

  const actionQ = (searchParams.get("action") ?? "").trim();
  const resourceType = (searchParams.get("resourceType") ?? "").trim();
  const fromDate = (searchParams.get("fromDate") ?? "").trim();
  const toDate = (searchParams.get("toDate") ?? "").trim();

  const createdAt: { gte?: Date; lte?: Date } = {};
  if (fromDate) {
    const dt = parseDateOnly(fromDate);
    if (!dt) return jsonError("Invalid fromDate", 400);
    createdAt.gte = dt;
  }
  if (toDate) {
    const dt = parseDateOnly(toDate);
    if (!dt) return jsonError("Invalid toDate", 400);
    // inclusive end-of-day UTC
    createdAt.lte = new Date(dt.getTime() + 24 * 60 * 60 * 1000 - 1);
  }

  if (actionQ && !isPatientAction(actionQ)) {
    return jsonError("Invalid action", 400);
  }

  const where = {
    userId: user.id,
    action: actionQ ? actionQ : { in: [...PATIENT_ACTIONS] },
    ...(resourceType ? { resourceType } : {}),
    ...(fromDate || toDate ? { createdAt } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: skipFor(page, pageSize),
      take: pageSize,
      select: {
        id: true,
        createdAt: true,
        action: true,
        resourceType: true,
        resourceId: true,
      },
    }),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}

