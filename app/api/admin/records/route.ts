import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { parsePage, parsePageSize, skipFor } from "@/lib/pagination";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("query") ?? "").trim();
  const page = parsePage(searchParams.get("page"));
  const pageSize = parsePageSize(searchParams.get("pageSize"));

  const where =
    query.length > 0
      ? {
          OR: [
            { title: { contains: query } },
            { user: { email: { contains: query } } },
          ],
        }
      : {};

  const [total, items] = await Promise.all([
    prisma.record.count({ where }),
    prisma.record.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: skipFor(page, pageSize),
      take: pageSize,
      select: {
        id: true,
        title: true,
        note: true,
        createdAt: true,
        user: { select: { id: true, email: true } },
        _count: { select: { files: true } },
      },
    }),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}

