import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { firstZodMessage } from "@/lib/zod-helpers";
import { z } from "zod";
import { AuditAction, logAudit } from "@/lib/audit";
import { ReminderType } from "@prisma/client";
import { parsePage, parsePageSize, skipFor } from "@/lib/pagination";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

const reminderType = z.enum(["APPOINTMENT", "MEDICATION", "TEST", "OTHER"]);
const createBody = z.object({
  userId: z.string().min(1),
  title: z.string().min(1).max(500),
  datetime: z.string().datetime(),
  type: reminderType,
});

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const userId = (searchParams.get("userId") ?? "").trim();
  const page = parsePage(searchParams.get("page"));
  const pageSize = parsePageSize(searchParams.get("pageSize"));

  const where = { ...(userId ? { userId } : {}) };

  const [total, items] = await Promise.all([
    prisma.reminder.count({ where }),
    prisma.reminder.findMany({
      where,
      orderBy: { datetime: "asc" },
      skip: skipFor(page, pageSize),
      take: pageSize,
      include: { user: { select: { id: true, email: true } } },
    }),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const parsed = createBody.safeParse(body);
  if (!parsed.success) return jsonError(firstZodMessage(parsed.error), 400);

  const { userId, title, datetime, type } = parsed.data;
  const reminder = await prisma.reminder.create({
    data: {
      userId,
      title,
      datetime: new Date(datetime),
      type: type as ReminderType,
    },
  });

  await logAudit(admin.id, AuditAction.ADMIN_REMINDER_CREATE, {
    resourceType: "Reminder",
    resourceId: reminder.id,
    metadata: { ok: true },
  });

  return NextResponse.json({ reminder }, { status: 201 });
}

