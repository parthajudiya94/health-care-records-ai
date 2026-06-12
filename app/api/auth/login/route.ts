import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  assertJwtSecretConfigured,
  createSessionForUser,
  setAuthCookie,
  verifyPassword,
} from "@/lib/auth";
import { loginBody } from "@/lib/validations";
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
  const parsed = loginBody.safeParse(body);
  if (!parsed.success) {
    return jsonError(firstZodMessage(parsed.error), 400);
  }
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return jsonError("Invalid email or password", 401);
  }
  const ok = await verifyPassword(password, user.password);
  if (!ok) {
    return jsonError("Invalid email or password", 401);
  }
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
  await logAudit(user.id, AuditAction.LOGIN, {
    resourceType: "User",
    resourceId: user.id,
    metadata: { ok: true },
  });
  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}

export function GET() {
  return jsonError("Method not allowed", 405);
}
