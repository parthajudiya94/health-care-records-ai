import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh grid grid-cols-1 md:grid-cols-2">
      <div
        className="relative hidden md:block"
        style={{
          background: `linear-gradient(165deg, #0a2420 0%, #0f3d35 40%, #4a6b5c 100%)`,
        }}
      >
        <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,#fff_2px,#fff_3px)]" />
        <div className="absolute bottom-0 left-0 p-10 text-white/90 max-w-sm">
          <p className="font-[family-name:var(--font-display)] text-2xl font-medium leading-tight">
            A calm home for the paperwork that follows you
          </p>
          <p className="mt-3 text-sm text-white/70">
            Aegis keeps summaries conservative and your files access-controlled.
            Consult your clinician for medical decisions.
          </p>
        </div>
      </div>
      <div className="flex min-h-dvh items-center justify-center p-6 md:p-12">
        {children}
      </div>
    </div>
  );
}
