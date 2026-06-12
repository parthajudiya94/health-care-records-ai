"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Props = {
  href: string;
  children: ReactNode;
  /** When true, matches nested paths (e.g. /records/xyz for href /records). */
  matchPrefix?: boolean;
  onNavigate?: () => void;
  className?: string;
};

export function NavLink({
  href,
  children,
  matchPrefix = false,
  onNavigate,
  className = "",
}: Props) {
  const pathname = usePathname();
  const active = matchPrefix
    ? pathname === href || pathname.startsWith(`${href}/`)
    : pathname === href;

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={
        "block rounded-xl px-3.5 py-2.5 text-sm font-medium transition " +
        (active
          ? "bg-tint/10 text-tint"
          : "text-ink-muted hover:bg-paper-elevated hover:text-ink") +
        " " +
        className
      }
    >
      {children}
    </Link>
  );
}
