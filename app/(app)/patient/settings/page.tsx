import { getSessionUserFromCookies } from "@/lib/auth";
import { Panel } from "@/components/ui/Panel";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function SettingsPage() {
  const user = await getSessionUserFromCookies();
  if (!user) redirect("/login");

  return (
    <div className="text-ink mx-auto max-w-2xl p-4 md:px-8 md:pt-8 md:pb-12">
      <header className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Settings</h1>
        <p className="text-ink-muted mt-1 text-sm">Account information for this session.</p>
      </header>
      <Panel className="p-5 sm:p-6">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-ink-muted text-xs tracking-wide uppercase">Name</dt>
            <dd className="text-ink mt-0.5 font-medium">{user.name}</dd>
          </div>
          <div>
            <dt className="text-ink-muted text-xs tracking-wide uppercase">Email</dt>
            <dd className="text-ink mt-0.5 break-all font-medium">{user.email}</dd>
          </div>
          <div>
            <dt className="text-ink-muted text-xs tracking-wide uppercase">Role</dt>
            <dd className="text-ink mt-0.5 font-medium">
              {user.role === "ADMIN" ? "Administrator" : "Patient"}
            </dd>
          </div>
        </dl>
        {user.role === "ADMIN" ? (
          <p className="text-ink-muted mt-5 text-xs">
            <Link className="text-tint font-medium" href="/admin">
              Open admin area
            </Link>
          </p>
        ) : null}
        <p className="text-ink-muted mt-4 border-t border-dashed border-border/80 pt-4 text-xs">
          Password changes and two-factor sign-in are not wired in this MVP. For a production
          system, add secure flows and document them under your HIPAA security policies.
        </p>
      </Panel>
    </div>
  );
}

