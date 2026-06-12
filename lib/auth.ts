import { compare, genSalt, hash } from "bcryptjs";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE, JWT_MAX_AGE_SEC, SESSION_MAX_AGE_SEC } from "./auth-constants";
import type { Role, User } from "@prisma/client";

const SALT_ROUNDS = 10;

function getJwtSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(s);
}

/** Call before any auth DB writes so misconfiguration does not leave orphan rows. */
export function assertJwtSecretConfigured() {
  getJwtSecret();
}

export type AuthTokenPayload = JWTPayload & {
  sub: string;
  role: Role;
  sid: string;
};

export async function hashPassword(plain: string) {
  const salt = await genSalt(SALT_ROUNDS);
  return hash(plain, salt);
}

export async function verifyPassword(plain: string, passwordHash: string) {
  return compare(plain, passwordHash);
}

export async function createSessionForUser(
  userId: string
): Promise<{ sessionId: string; token: string; expires: Date }> {
  const expires = new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000);
  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt: expires,
    },
  });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const token = await new SignJWT({
    sub: user.id,
    role: user.role,
    sid: session.id,
  } satisfies { sub: string; role: Role; sid: string })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(new Date(Date.now() + JWT_MAX_AGE_SEC * 1000))
    .sign(getJwtSecret());

  return { sessionId: session.id, token, expires };
}

export async function verifyAuthToken(
  token: string | undefined
): Promise<AuthTokenPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ["HS256"],
    });
    return payload as AuthTokenPayload;
  } catch {
    return null;
  }
}

function isPayload(
  p: AuthTokenPayload | null
): p is AuthTokenPayload {
  return (
    !!p &&
    typeof p.sub === "string" &&
    typeof p.sid === "string" &&
    (p.role === "PATIENT" || p.role === "ADMIN")
  );
}

export async function getSessionUser(
  token: string | undefined
): Promise<User | null> {
  if (!token) return null;
  const payload = await verifyAuthToken(token);
  if (!isPayload(payload)) return null;
  const session = await prisma.session.findFirst({
    where: {
      id: payload.sid,
      userId: payload.sub,
      expiresAt: { gt: new Date() },
    },
  });
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: payload.sub } });
}

export async function getSessionUserFromCookies() {
  const c = await cookies();
  return getSessionUser(c.get(AUTH_COOKIE)?.value);
}

export async function deleteSessionByTokenPayload(payload: AuthTokenPayload) {
  await prisma.session.deleteMany({
    where: { id: payload.sid, userId: payload.sub },
  });
}

export function setAuthCookie(
  token: string,
  expires: Date
): {
  name: string;
  value: string;
  httpOnly: boolean;
  path: string;
  sameSite: "lax";
  secure: boolean;
  expires: Date;
} {
  return {
    name: AUTH_COOKIE,
    value: token,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires,
  };
}

export function clearAuthCookieHeader(): string {
  return `${AUTH_COOKIE}=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax${
    process.env.NODE_ENV === "production" ? "; Secure" : ""
  }`;
}
