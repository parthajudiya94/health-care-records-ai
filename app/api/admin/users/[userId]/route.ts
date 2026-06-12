import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { firstZodMessage } from "@/lib/zod-helpers";
import { z } from "zod";
import { AuditAction, logAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/auth";

type Ctx = { params: Promise<{ userId: string }> };

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

const patchBody = z.object({
  name: z.string().min(1).max(200).optional(),
  role: z.enum(["PATIENT", "ADMIN"]).optional(),
  resetPassword: z.string().min(8, "At least 8 characters").optional(),
});

export async function PATCH(request: Request, { params }: Ctx) {
  const { userId } = await params;
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

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!existing) return jsonError("Not found", 404);

  const d = parsed.data;
  const nextData: { name?: string; role?: "PATIENT" | "ADMIN"; password?: string } =
    {};

  if (d.name != null) nextData.name = d.name;
  if (d.role != null) nextData.role = d.role;
  if (d.resetPassword != null) {
    nextData.password = await hashPassword(d.resetPassword);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: nextData,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  if (d.resetPassword != null) {
    await logAudit(admin.id, AuditAction.ADMIN_USER_PASSWORD_RESET, {
      resourceType: "User",
      resourceId: userId,
      metadata: { ok: true },
    });
  }
  if (d.name != null || d.role != null) {
    await logAudit(admin.id, AuditAction.ADMIN_USER_UPDATE, {
      resourceType: "User",
      resourceId: userId,
      metadata: { ok: true },
    });
  }

  return NextResponse.json({ user: updated });
}

