import { AppChrome } from "@/components/app/AppChrome";
import { getSessionUserFromCookies } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function PatientLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUserFromCookies();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admin/dashboard");

  return (
    <AppChrome
      user={{ name: user.name, email: user.email, role: user.role }}
      brandTitle="Aegis"
      brandHref="/patient/dashboard"
      brandSubtitle="Your care, in order."
      navItems={[
        { href: "/patient/dashboard", label: "Dashboard" },
        { href: "/patient/records", label: "Records", matchPrefix: true },
        { href: "/patient/reminders", label: "Reminders" },
        { href: "/patient/chat-history", label: "Chat history", matchPrefix: true },
        { href: "/patient/audit", label: "Audit" },
        { href: "/patient/settings", label: "Settings" },
      ]}
    >
      {children}
    </AppChrome>
  );
}

