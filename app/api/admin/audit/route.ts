import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { parsePage, parsePageSize, skipFor } from "@/lib/pagination";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function clampTake(v: string | null, def: number) {
  const n = Number(v ?? String(def));
  if (!Number.isFinite(n)) return def;
  return Math.min(100, Math.max(10, Math.floor(n)));
}

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const page = parsePage(searchParams.get("page"));
  const pageSize = parsePageSize(searchParams.get("pageSize"));

  const action = (searchParams.get("action") ?? "").trim();
  const userId = (searchParams.get("userId") ?? "").trim();
  const resourceType = (searchParams.get("resourceType") ?? "").trim();
  const resourceId = (searchParams.get("resourceId") ?? "").trim();
  const from = (searchParams.get("from") ?? "").trim();
  const to = (searchParams.get("to") ?? "").trim();

  const createdAt: { gte?: Date; lte?: Date } = {};
  if (from) createdAt.gte = new Date(from);
  if (to) createdAt.lte = new Date(to);

  const where = {
    ...(action ? { action } : {}),
    ...(userId ? { userId } : {}),
    ...(resourceType ? { resourceType } : {}),
    ...(resourceId ? { resourceId } : {}),
    ...(from || to ? { createdAt } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: skipFor(page, pageSize),
      take: pageSize,
      include: { user: { select: { id: true, email: true } } },
    }),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}

