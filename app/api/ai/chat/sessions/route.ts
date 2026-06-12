import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserFromCookies } from "@/lib/auth";
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
  const skip = skipFor(page, pageSize);

  const db = prisma as any;

  const [total, rows] = await Promise.all([
    db.chatSession.count({ where: { userId: user.id } }),
    db.chatSession.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        createdAt: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, createdAt: true },
        },
        _count: { select: { messages: true } },
      },
    }),
  ]);

  const items = (rows as Array<any>).map((s) => {
    const last = Array.isArray(s.messages) && s.messages.length ? s.messages[0] : null;
    const lastMessageAt = (last?.createdAt ?? s.createdAt) as Date;
    const lastMessagePreview = String(last?.content ?? "").trim().slice(0, 160);
    const messageCount = Number(s?._count?.messages ?? 0) || 0;
    return {
      id: String(s.id),
      createdAt: s.createdAt as Date,
      lastMessageAt,
      lastMessagePreview,
      messageCount,
    };
  });

  return NextResponse.json({ items, total, page, pageSize });
}

