import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

type Ctx = { params: Promise<{ recordId: string }> };

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(_req: Request, { params }: Ctx) {
  const { recordId } = await params;
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const record = await prisma.record.findUnique({
    where: { id: recordId },
    include: {
      user: { select: { id: true, email: true, name: true, role: true } },
      files: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!record) return jsonError("Not found", 404);
  return NextResponse.json({ record });
}

