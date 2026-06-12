"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { NavLink } from "@/components/app/NavLink";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { GhostButton } from "@/components/ui/GhostButton";
import { AssistantWidget } from "@/components/patient/AssistantWidget";
import { Bell } from "lucide-react";
type Role = "PATIENT" | "ADMIN";

export type AppUser = {
  name: string;
  email: string;
  role: Role;
};

export type ChromeNavItem = {
  href: string;
  label: string;
  matchPrefix?: boolean;
  className?: string;
};

function NavList({
  user,
  navItems,
  onNavigate,
}: {
  user: AppUser;
  navItems: ChromeNavItem[];
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-0.5 p-2" aria-label="Main">
      {navItems.map((it) => (
        <NavLink
          key={it.href}
          href={it.href}
          matchPrefix={!!it.matchPrefix}
          onNavigate={onNavigate}
          className={it.className ?? ""}
        >
          {it.label}
        </NavLink>
      ))}
      {user.role === "ADMIN" && !navItems.some((n) => n.href.startsWith("/admin")) ? (
        <NavLink
          href="/admin"
          onNavigate={onNavigate}
          className="mt-1 border-t border-border/60 pt-2"
        >
          Admin
        </NavLink>
      ) : null}
    </nav>
  );
}

function UserFooter({
  user,
  onAfterLogout,
}: {
  user: AppUser;
  onAfterLogout?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      onAfterLogout?.();
    }
    router.push("/login");
  }

  return (
    <div className="border-t border-border/60 p-3">
      <p className="truncate text-xs font-medium text-ink" title={user.name}>
        {user.name}
      </p>
      <p
        className="mb-2 truncate text-xs text-ink-muted"
        title={user.email}
      >
        {user.email}
      </p>
      <PrimaryButton
        className="w-full py-2 text-sm"
        disabled={loading}
        onClick={logout}
      >
        {loading ? "…" : "Sign out"}
      </PrimaryButton>
    </div>
  );
}

export function AppChrome({
  user,
  brandTitle = "Aegis",
  brandHref = "/",
  brandSubtitle,
  navItems,
  children,
}: {
  user: AppUser;
  brandTitle?: string;
  brandHref?: string;
  brandSubtitle?: string;
  navItems: ChromeNavItem[];
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setMenuOpen(false);
  const activeLabel = labelForPath(pathname, navItems);
  const isPatient = navItems.some((n) => n.href.startsWith("/patient"));

  const [unread, setUnread] = useState<number>(0);
  useEffect(() => {
    if (!isPatient) return;
    let cancelled = false;
    async function loadUnread() {
      try {
        const res = await fetch("/api/notifications?page=1&pageSize=10", {
          credentials: "include",
        });
        const data = (await res.json().catch(() => ({}))) as {
          unreadTotal?: number;
        };
        if (!cancelled) setUnread(Number(data.unreadTotal ?? 0) || 0);
      } catch {
        if (!cancelled) setUnread(0);
      }
    }
    void loadUnread();
    const t = window.setInterval(loadUnread, 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [isPatient]);

  return (
    <div className="flex min-h-dvh font-sans">
      <div className="md:hidden">
        <header
          className="fixed top-0 right-0 left-0 z-30 flex h-14 items-center justify-between border-b border-border/80 bg-paper/90 px-4 py-0 backdrop-blur"
          style={{ paddingTop: "max(env(safe-area-inset-top, 0), 0px)" }}
        >
          <span className="font-[family-name:var(--font-display)] text-lg text-tint">
            {brandTitle}
          </span>
          <div className="flex items-center gap-2">
            {activeLabel ? (
              <span className="text-xs text-ink-muted" aria-hidden>
                {activeLabel}
              </span>
            ) : null}
            {isPatient ? (
              <Link
                href="/patient/notifications"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-white/50 text-sm font-medium text-ink hover:bg-white transition"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="h-4 w-4 text-ink" aria-hidden />
                {unread > 0 ? (
                  <span className="absolute -top-1 -right-1 inline-flex min-w-5 items-center justify-center rounded-full bg-tint px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {unread > 99 ? "99+" : unread}
                  </span>
                ) : null}
              </Link>
            ) : null}
            <GhostButton
              type="button"
              onClick={() => setMenuOpen(true)}
              className="py-1.5 text-sm"
            >
              Menu
            </GhostButton>
          </div>
        </header>

        {menuOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 cursor-default bg-ink/25 backdrop-blur-sm"
              aria-label="Close menu"
              onClick={close}
            />
            <div className="bg-paper-elevated/98 fixed right-0 bottom-0 z-50 flex w-[min(20rem,92vw)] flex-col border-l border-border shadow-2xl">
              <div className="bg-tint/6 flex items-center justify-between border-b border-border/60 p-3">
                <p className="text-sm font-semibold text-ink">Navigate</p>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-lg px-2 py-1 text-sm text-ink-muted hover:bg-paper-elevated hover:text-ink"
                >
                  Close
                </button>
              </div>
              <NavList user={user} navItems={navItems} onNavigate={close} />
              <UserFooter user={user} onAfterLogout={close} />
            </div>
          </>
        ) : null}
      </div>

      <aside
        className="border-border/80 text-ink bg-paper-elevated/30 hidden w-64 shrink-0 border-r flex-col justify-between shadow-[inset_-1px_0_0_0] shadow-border/20 md:flex md:flex-col"
        aria-label="App sidebar"
      >
        <div>
          <div className="p-4 pb-2">
            <Link
              href={brandHref}
              className="block font-[family-name:var(--font-display)] text-2xl tracking-tight text-tint"
            >
              {brandTitle}
            </Link>
            {brandSubtitle ? (
              <p className="mt-1.5 text-xs text-ink-muted">{brandSubtitle}</p>
            ) : null}
          </div>
          <NavList user={user} navItems={navItems} />
        </div>
        <UserFooter user={user} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pt-14 md:pt-0">
        <div className="min-h-dvh border-border/20 flex-1 border-t border-dashed max-md:border-0 max-md:pt-0">
          <div className="p-4 md:p-8">
            <div className="mx-auto w-full max-w-6xl">
              {isPatient ? (
                <div className="mb-3 hidden justify-end md:flex">
                  <Link
                    href="/patient/notifications"
                    className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-white/50 text-sm font-medium text-ink hover:bg-white transition"
                    aria-label="Notifications"
                    title="Notifications"
                  >
                    <Bell className="h-4 w-4 text-ink" aria-hidden />
                    {unread > 0 ? (
                      <span className="absolute -top-1 -right-1 inline-flex min-w-5 items-center justify-center rounded-full bg-tint px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    ) : null}
                  </Link>
                </div>
              ) : null}
              {children}
            </div>
          </div>
        </div>
      </div>

      {isPatient ? <AssistantWidget /> : null}
    </div>
  );
}

function labelForPath(pathname: string, navItems: ChromeNavItem[]) {
  for (const it of navItems) {
    const matchPrefix = !!it.matchPrefix;
    const active = matchPrefix
      ? pathname === it.href || pathname.startsWith(`${it.href}/`)
      : pathname === it.href;
    if (active) return it.label;
  }
  return "";
}
