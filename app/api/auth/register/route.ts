import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  assertJwtSecretConfigured,
  createSessionForUser,
  hashPassword,
  setAuthCookie,
} from "@/lib/auth";
import { registerBody } from "@/lib/validations";
import { AuditAction, logAudit } from "@/lib/audit";
import { cookies } from "next/headers";
import { firstZodMessage } from "@/lib/zod-helpers";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  assertJwtSecretConfigured();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const parsed = registerBody.safeParse(body);
  if (!parsed.success) {
    return jsonError(firstZodMessage(parsed.error), 400);
  }
  const { name, email, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return jsonError("An account with this email already exists", 400);
  }
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: passwordHash,
      role: Role.PATIENT,
    },
  });
  const { token, expires } = await createSessionForUser(user.id);
  const cookieStore = await cookies();
  const opts = setAuthCookie(token, expires);
  cookieStore.set({
    name: opts.name,
    value: opts.value,
    httpOnly: opts.httpOnly,
    path: opts.path,
    sameSite: opts.sameSite,
    secure: opts.secure,
    expires: opts.expires,
  });
  await logAudit(user.id, AuditAction.REGISTER, {
    resourceType: "User",
    resourceId: user.id,
    metadata: { ok: true },
  });
  return NextResponse.json(
    { user: { id: user.id, name: user.name, email: user.email, role: user.role } },
    { status: 201 }
  );
}

// Prevent accidental use of GET
export function GET() {
  return jsonError("Method not allowed", 405);
}
