import { NextResponse } from "next/server";
import { getSessionUserFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ recordId: string }> };

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(_req: Request, { params }: Ctx) {
  const { recordId } = await params;
  const user = await getSessionUserFromCookies();
  if (!user) return jsonError("Unauthorized", 401);

  const record = await prisma.record.findFirst({
    where: { id: recordId, userId: user.id },
    include: {
      files: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!record) return jsonError("Not found", 404);
  return NextResponse.json({ record });
}

