import { NextResponse } from "next/server";
import { getSessionUserFromCookies } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUserFromCookies();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}
