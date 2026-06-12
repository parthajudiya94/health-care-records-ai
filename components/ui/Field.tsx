import type { InputHTMLAttributes, ReactNode } from "react";

type Props = {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>;

export function Field({ id, label, error, hint, className = "", ...input }: Props) {
  return (
    <label className="flex flex-col gap-1.5" htmlFor={id}>
      <span className="text-sm font-medium text-ink-muted tracking-wide uppercase">
        {label}
      </span>
      <input
        id={id}
        className={
          "rounded-xl border border-border bg-white px-3.5 py-2.5 text-ink " +
          "placeholder:text-ink-muted/50 transition shadow-inner " +
          "hover:border-sage/60 " +
          className
        }
        {...input}
      />
      {hint ? <span className="text-xs text-ink-muted">{hint}</span> : null}
      {error ? (
        <span className="text-sm text-error" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}
