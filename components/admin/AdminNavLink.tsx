"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Props = {
  href: string;
  children: ReactNode;
  matchPrefix?: boolean;
  className?: string;
};

export function AdminNavLink({
  href,
  children,
  matchPrefix = false,
  className = "",
}: Props) {
  const pathname = usePathname();
  const active = matchPrefix
    ? pathname === href || pathname.startsWith(`${href}/`)
    : pathname === href;

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        "block rounded-xl px-3.5 py-2.5 text-sm font-medium transition " +
        (active
          ? "bg-tint/12 text-tint"
          : "text-ink-muted hover:bg-paper-elevated hover:text-ink") +
        " " +
        className
      }
    >
      {children}
    </Link>
  );
}

