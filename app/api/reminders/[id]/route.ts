import { NextResponse } from "next/server";
import { ReminderType } from "@prisma/client";
import { getSessionUserFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateReminderBody } from "@/lib/validations";
import { AuditAction, logAudit } from "@/lib/audit";
import { firstZodMessage } from "@/lib/zod-helpers";

type Ctx = { params: Promise<{ id: string }> };

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function PATCH(
  request: Request,
  { params }: Ctx
) {
  const { id } = await params;
  const user = await getSessionUserFromCookies();
  if (!user) {
    return jsonError("Unauthorized", 401);
  }
  const existing = await prisma.reminder.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return jsonError("Not found", 404);
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const parsed = updateReminderBody.safeParse(body);
  if (!parsed.success) {
    return jsonError(firstZodMessage(parsed.error), 400);
  }
  const d = parsed.data;
  const reminder = await prisma.reminder.update({
    where: { id },
    data: {
      ...(d.title != null && { title: d.title }),
      ...(d.datetime != null && { datetime: new Date(d.datetime) }),
      ...(d.type != null && { type: d.type as ReminderType }),
      ...(d.recurring != null && { recurring: d.recurring }),
    },
  });
  try {
    await prisma.notification.create({
      data: {
        userId: user.id,
        kind: "REMINDER_UPDATED",
        title: `Reminder updated: ${reminder.title}`,
        metadata: { reminderId: id },
      },
    });
  } catch {
    // never break reminder update if notifications table isn't available yet
  }
  await logAudit(user.id, AuditAction.REMINDER_UPDATE, {
    resourceType: "Reminder",
    resourceId: id,
    metadata: { ok: true },
  });
  return NextResponse.json({ reminder });
}

export async function DELETE(
  _request: Request,
  { params }: Ctx
) {
  const { id } = await params;
  const user = await getSessionUserFromCookies();
  if (!user) {
    return jsonError("Unauthorized", 401);
  }
  const existing = await prisma.reminder.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return jsonError("Not found", 404);
  }
  await prisma.reminder.delete({ where: { id } });
  try {
    await prisma.notification.create({
      data: {
        userId: user.id,
        kind: "REMINDER_DELETED",
        title: `Reminder deleted: ${existing.title}`,
        metadata: { reminderId: id },
      },
    });
  } catch {
    // never break reminder delete if notifications table isn't available yet
  }
  await logAudit(user.id, AuditAction.REMINDER_DELETE, {
    resourceType: "Reminder",
    resourceId: id,
    metadata: { ok: true },
  });
  return NextResponse.json({ ok: true });
}
