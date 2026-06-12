import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE } from "@/lib/auth-constants";
import {
  verifyAuthToken,
  deleteSessionByTokenPayload,
  type AuthTokenPayload,
} from "@/lib/auth";
import { AuditAction, logAudit } from "@/lib/audit";

function isAuthPayload(p: unknown): p is AuthTokenPayload {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  return (
    (o.role === "PATIENT" || o.role === "ADMIN") &&
    typeof o.sub === "string" &&
    typeof o.sid === "string"
  );
}

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  const raw = await verifyAuthToken(token);
  if (isAuthPayload(raw)) {
    await deleteSessionByTokenPayload(raw);
    await logAudit(raw.sub, AuditAction.LOGOUT, {
      metadata: { ok: true },
    });
  }
  cookieStore.set({
    name: AUTH_COOKIE,
    value: "",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
  return NextResponse.json({ ok: true });
}
