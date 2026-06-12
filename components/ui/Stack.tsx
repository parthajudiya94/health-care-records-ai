import type { ReactNode } from "react";

export function Stack({
  className = "",
  gap = "gap-4",
  children,
}: {
  className?: string;
  gap?: string;
  children: ReactNode;
}) {
  return <div className={`flex flex-col ${gap} ${className}`}>{children}</div>;
}
