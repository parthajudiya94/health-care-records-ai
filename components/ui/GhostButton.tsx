import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = { children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>;

export function GhostButton({ className = "", children, ...rest }: Props) {
  return (
    <button
      type="button"
      className={
        "inline-flex items-center justify-center rounded-2xl border border-border " +
        "bg-white/50 px-4 py-2 text-sm font-medium text-ink " +
        "hover:bg-white transition active:scale-[0.99] disabled:opacity-50 " +
        className
      }
      {...rest}
    >
      {children}
    </button>
  );
}
