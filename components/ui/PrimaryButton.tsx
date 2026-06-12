import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = {
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function PrimaryButton({ className = "", children, ...rest }: Props) {
  return (
    <button
      type="button"
      className={
        "inline-flex items-center justify-center rounded-2xl bg-tint px-5 py-2.5 " +
        "text-sm font-semibold text-white transition hover:bg-tint-bright " +
        "active:scale-[0.99] disabled:opacity-50 " +
        className
      }
      {...rest}
    >
      {children}
    </button>
  );
}
