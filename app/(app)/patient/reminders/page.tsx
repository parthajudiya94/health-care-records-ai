import { RemindersClient } from "@/components/app/RemindersClient";

export default function RemindersPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-ink">
          Reminders
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Keep a simple list of dates that matter. This build does not send email or push notifications.
        </p>
      </div>
      <RemindersClient />
    </div>
  );
}

