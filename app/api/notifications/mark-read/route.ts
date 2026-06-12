import { NextResponse } from "next/server";
import { getSessionUserFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { firstZodMessage } from "@/lib/zod-helpers";
import { AuditAction, logAudit } from "@/lib/audit";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

const bodySchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200).optional(),
  all: z.boolean().optional(),
});

export async function POST(request: Request) {
  const user = await getSessionUserFromCookies();
  if (!user) return jsonError("Unauthorized", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodMessage(parsed.error), 400);

  const now = new Date();
  const { ids, all } = parsed.data;

  if (!all && (!ids || ids.length === 0)) {
    return jsonError("Provide ids or set all=true", 400);
  }

  if (all) {
    await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: now },
    });
  } else {
    await prisma.notification.updateMany({
      where: { userId: user.id, id: { in: ids! } },
      data: { readAt: now },
    });
  }

  await logAudit(user.id, AuditAction.NOTIFICATION_MARK_READ, {
    resourceType: "Notification",
    metadata: { all: !!all, idsCount: ids?.length ?? 0 },
  });

  return NextResponse.json({ ok: true });
}

