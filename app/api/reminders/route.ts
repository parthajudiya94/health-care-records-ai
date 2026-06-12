import { NextResponse } from "next/server";
import { ReminderType } from "@prisma/client";
import { getSessionUserFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createReminderBody } from "@/lib/validations";
import { AuditAction, logAudit } from "@/lib/audit";
import { firstZodMessage } from "@/lib/zod-helpers";
import { parsePage, parsePageSize, skipFor } from "@/lib/pagination";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const user = await getSessionUserFromCookies();
  if (!user) {
    return jsonError("Unauthorized", 401);
  }
  const { searchParams } = new URL(request.url);
  const upcoming = searchParams.get("upcoming") === "1";
  const page = parsePage(searchParams.get("page"));
  const pageSize = parsePageSize(searchParams.get("pageSize"));
  const now = new Date();
  const where = {
    userId: user.id,
    ...(upcoming ? { datetime: { gte: now } } : {}),
  };

  const [total, reminders] = await Promise.all([
    prisma.reminder.count({ where }),
    prisma.reminder.findMany({
      where,
      orderBy: { datetime: "asc" },
      skip: skipFor(page, pageSize),
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ reminders, total, page, pageSize });
}

export async function POST(request: Request) {
  const user = await getSessionUserFromCookies();
  if (!user) {
    return jsonError("Unauthorized", 401);
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const parsed = createReminderBody.safeParse(body);
  if (!parsed.success) {
    return jsonError(firstZodMessage(parsed.error), 400);
  }
  const { title, datetime, type, recurring } = parsed.data;
  const reminder = await prisma.reminder.create({
    data: {
      userId: user.id,
      title,
      datetime: new Date(datetime),
      type: type as ReminderType,
      ...(recurring ? { recurring } : {}),
    },
  });
  try {
    await prisma.notification.create({
      data: {
        userId: user.id,
        kind: "REMINDER_CREATED",
        title: `Reminder created: ${title}`,
        metadata: { reminderId: reminder.id, type },
      },
    });
  } catch {
    // never break reminder create if notifications table isn't available yet
  }
  await logAudit(user.id, AuditAction.REMINDER_CREATE, {
    resourceType: "Reminder",
    resourceId: reminder.id,
    metadata: { ok: true },
  });
  return NextResponse.json({ reminder }, { status: 201 });
}
