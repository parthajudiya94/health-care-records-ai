import { PatientNotificationsInbox } from "@/components/patient/PatientNotificationsInbox";

export default function PatientNotificationsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-ink">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          In-app activity alerts (reminders and important account events).
        </p>
      </div>
      <PatientNotificationsInbox />
    </div>
  );
}

