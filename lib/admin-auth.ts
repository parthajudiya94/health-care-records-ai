import { getSessionUserFromCookies } from "@/lib/auth";

export async function requireAdmin() {
  const user = await getSessionUserFromCookies();
  if (!user || user.role !== "ADMIN") {
    return null;
  }
  return user;
}

