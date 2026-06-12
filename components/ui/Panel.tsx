import type { ReactNode } from "react";

export function Panel({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-paper-elevated/80 shadow-sm backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}
