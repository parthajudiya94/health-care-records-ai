"use client";

import { useRouter } from "next/navigation";
import { GhostButton } from "@/components/ui/GhostButton";

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/");
    router.refresh();
  }
  return (
    <GhostButton type="button" onClick={() => void logout()}>
      Sign out
    </GhostButton>
  );
}
