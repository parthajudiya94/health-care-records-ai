import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { firstZodMessage } from "@/lib/zod-helpers";
import { z } from "zod";
import { AuditAction, logAudit } from "@/lib/audit";
import { ReminderType } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

const reminderType = z.enum(["APPOINTMENT", "MEDICATION", "OTHER"]);
const patchBody = z
  .object({
    title: z.string().min(1).max(500).optional(),
    datetime: z.string().datetime().optional(),
    type: reminderType.optional(),
  })
  .refine((x) => Object.keys(x).length > 0, "No fields to update");

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const parsed = patchBody.safeParse(body);
  if (!parsed.success) return jsonError(firstZodMessage(parsed.error), 400);

  const existing = await prisma.reminder.findUnique({ where: { id } });
  if (!existing) return jsonError("Not found", 404);

  const d = parsed.data;
  const updated = await prisma.reminder.update({
    where: { id },
    data: {
      ...(d.title != null && { title: d.title }),
      ...(d.datetime != null && { datetime: new Date(d.datetime) }),
      ...(d.type != null && { type: d.type as ReminderType }),
    },
  });

  await logAudit(admin.id, AuditAction.ADMIN_REMINDER_UPDATE, {
    resourceType: "Reminder",
    resourceId: id,
    metadata: { ok: true },
  });

  return NextResponse.json({ reminder: updated });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const existing = await prisma.reminder.findUnique({ where: { id } });
  if (!existing) return jsonError("Not found", 404);

  await prisma.reminder.delete({ where: { id } });

  await logAudit(admin.id, AuditAction.ADMIN_REMINDER_DELETE, {
    resourceType: "Reminder",
    resourceId: id,
    metadata: { ok: true },
  });

  return NextResponse.json({ ok: true });
}

