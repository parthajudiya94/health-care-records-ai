import { NextResponse } from "next/server";
import { getSessionUserFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePage, parsePageSize, skipFor } from "@/lib/pagination";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const user = await getSessionUserFromCookies();
  if (!user) return jsonError("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const page = parsePage(searchParams.get("page"));
  const pageSize = parsePageSize(searchParams.get("pageSize"));

  const where = { userId: user.id };

  const [unreadTotal, total, items] = await Promise.all([
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: skipFor(page, pageSize),
      take: pageSize,
      select: {
        id: true,
        kind: true,
        title: true,
        metadata: true,
        readAt: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({ items, unreadTotal, total, page, pageSize });
}

