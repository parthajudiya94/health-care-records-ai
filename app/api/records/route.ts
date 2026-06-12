import { NextResponse } from "next/server";
import { getSessionUserFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createRecordBody } from "@/lib/validations";
import { firstZodMessage } from "@/lib/zod-helpers";
import { AuditAction, logAudit } from "@/lib/audit";
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
  const query = (searchParams.get("query") ?? "").trim();
  const reportType = (searchParams.get("reportType") ?? "").trim();
  const riskLevel = (searchParams.get("riskLevel") ?? "").trim();
  const fromDate = (searchParams.get("fromDate") ?? "").trim();
  const toDate = (searchParams.get("toDate") ?? "").trim();

  const createdAt: { gte?: Date; lte?: Date } = {};
  if (fromDate) createdAt.gte = new Date(fromDate);
  if (toDate) createdAt.lte = new Date(toDate);

  const where: any = {
    userId: user.id,
    ...(query.length > 0
      ? { OR: [{ title: { contains: query } }, { note: { contains: query } }] }
      : {}),
    ...(fromDate || toDate ? { createdAt } : {}),
    ...(reportType || riskLevel
      ? {
          files: {
            some: {
              ...(reportType ? { reportType } : {}),
              ...(riskLevel ? { riskLevel } : {}),
            },
          },
        }
      : {}),
  };

  const [total, records] = await Promise.all([
    prisma.record.count({ where }),
    prisma.record.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: skipFor(page, pageSize),
      take: pageSize,
      include: {
        _count: { select: { files: true } },
        files: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            createdAt: true,
            fileName: true,
            summaryStatus: true,
            reportType: true,
            riskLevel: true,
          },
        },
      },
    }),
  ]);

  return NextResponse.json({ records, total, page, pageSize });
}

export async function POST(request: Request) {
  const user = await getSessionUserFromCookies();
  if (!user) return jsonError("Unauthorized", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const parsed = createRecordBody.safeParse(body);
  if (!parsed.success) {
    return jsonError(firstZodMessage(parsed.error), 400);
  }

  const record = await prisma.record.create({
    data: {
      userId: user.id,
      title: parsed.data.title,
      note: parsed.data.note,
    },
  });

  await logAudit(user.id, AuditAction.RECORD_CREATE, {
    resourceType: "Record",
    resourceId: record.id,
    metadata: { ok: true },
  });

  return NextResponse.json({ record }, { status: 201 });
}

