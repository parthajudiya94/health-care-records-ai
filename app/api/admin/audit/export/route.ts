import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

function csvEscape(v: unknown) {
  const s = String(v ?? "");
  const needs = /[",\n]/.test(s);
  const inner = s.replace(/"/g, '""');
  return needs ? `"${inner}"` : inner;
}

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
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

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 5000,
    include: { user: { select: { email: true } } },
  });

  const header = ["id", "createdAt", "action", "userId", "userEmail", "resourceType", "resourceId"].join(",");
  const lines = rows.map((r) =>
    [
      csvEscape(r.id),
      csvEscape(r.createdAt.toISOString()),
      csvEscape(r.action),
      csvEscape(r.userId),
      csvEscape(r.user?.email ?? ""),
      csvEscape(r.resourceType ?? ""),
      csvEscape(r.resourceId ?? ""),
    ].join(",")
  );
  const csv = [header, ...lines].join("\n");

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"audit-${stamp}.csv\"`,
    },
  });
}

