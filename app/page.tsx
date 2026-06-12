import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Stack } from "@/components/ui/Stack";
import { Panel } from "@/components/ui/Panel";

const mark = Plus_Jakarta_Sans({ weight: "600", subsets: ["latin"] });

export default function Home() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-6">
        <span className={`${mark.className} text-base tracking-tight text-tint`}>
          Aegis
        </span>
        <div className="flex gap-3 text-sm">
          <Link
            className="rounded-2xl px-3 py-2 text-ink-muted transition hover:text-tint"
            href="/login"
          >
            Log in
          </Link>
          <Link
            className="rounded-2xl bg-tint px-3 py-2 text-white font-medium transition hover:bg-tint-bright"
            href="/register"
          >
            Get started
          </Link>
        </div>
      </header>
      <main className="mx-auto grid max-w-5xl gap-12 px-6 pb-24 pt-4 md:grid-cols-5 md:items-stretch">
        <section className="md:col-span-3">
          <Stack className="max-w-xl" gap="gap-6">
            <p className="font-[family-name:var(--font-display)] text-4xl leading-tight sm:text-5xl">
              Your medical documents, summarized without the noise
            </p>
            <p className="text-lg leading-relaxed text-ink-muted">
              A patient-first place to keep PDFs and notes, read plain-language
              takeaways, and nudge your future you with simple reminders. Not a
              doctor—just clarity, with guardrails.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                className="inline-flex items-center justify-center rounded-2xl bg-tint px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-tint-bright active:scale-[0.99]"
                href="/register"
              >
                Create a free account
              </Link>
            </div>
          </Stack>
        </section>
        <aside className="md:col-span-2">
          <Panel className="h-full p-6">
            <Stack gap="gap-3">
              <h2 className="font-[family-name:var(--font-display)] text-xl text-tint">
                Built for one job
              </h2>
              <ul className="space-y-2 text-sm text-ink-muted leading-relaxed">
                <li>Private dashboard with role-based access</li>
                <li>On-device feel: calm typography, no widget clutter</li>
                <li>Upload → summary → your next step list</li>
                <li>Reminders without a notification barrage (yet)</li>
              </ul>
            </Stack>
          </Panel>
        </aside>
      </main>
    </div>
  );
}
