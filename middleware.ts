import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, type JWTVerifyResult } from "jose";
import { AUTH_COOKIE } from "@/lib/auth-constants";
import type { AuthTokenPayload } from "@/lib/auth";

const alg = "HS256";

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) return null;
  return new TextEncoder().encode(s);
}

export async function middleware(request: NextRequest) {
  const secret = getSecret();
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!secret || !token) {
    return deny(request);
  }
  let verified: JWTVerifyResult;
  try {
    verified = await jwtVerify(token, secret, { algorithms: [alg] });
  } catch {
    return deny(request);
  }
  const p = verified.payload as Partial<AuthTokenPayload>;
  if (typeof p.sub !== "string" || typeof p.sid !== "string" || !p.role) {
    return deny(request);
  }
  if (request.nextUrl.pathname.startsWith("/admin") && p.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/patient/dashboard", request.url));
  }
  // Keep admin and patient portals separated.
  if (request.nextUrl.pathname.startsWith("/patient") && p.role === "ADMIN") {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }
  return NextResponse.next();
}

function deny(request: NextRequest) {
  const p = request.nextUrl.pathname;
  if (p.startsWith("/api/")) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const login = new URL("/login", request.url);
  login.searchParams.set("from", p);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/patient/:path*",
    "/admin/:path*",
    "/api/records/:path*",
    "/api/reminders/:path*",
    "/api/admin/:path*",
  ],
};
