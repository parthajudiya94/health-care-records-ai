import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { firstZodMessage } from "@/lib/zod-helpers";
import { z } from "zod";
import { AuditAction, logAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/auth";
import { parsePage, parsePageSize, skipFor } from "@/lib/pagination";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

const createUserBody = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  password: z.string().min(8, "At least 8 characters"),
  role: z.enum(["PATIENT", "ADMIN"]).optional(),
});

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
            { email: { contains: query } },
            { name: { contains: query } },
          ],
        }
      : {};

  const [total, items] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: skipFor(page, pageSize),
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const parsed = createUserBody.safeParse(body);
  if (!parsed.success) return jsonError(firstZodMessage(parsed.error), 400);

  const { name, email, password, role } = parsed.data;
  const passwordHash = await hashPassword(password);

  const created = await prisma.user.create({
    data: {
      name,
      email,
      password: passwordHash,
      role: role ?? "PATIENT",
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  await logAudit(admin.id, AuditAction.ADMIN_USER_CREATE, {
    resourceType: "User",
    resourceId: created.id,
    metadata: { ok: true },
  });

  return NextResponse.json({ user: created }, { status: 201 });
}

