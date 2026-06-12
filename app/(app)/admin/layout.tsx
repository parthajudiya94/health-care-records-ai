import { redirect } from "next/navigation";
import { getSessionUserFromCookies } from "@/lib/auth";
import { AppChrome } from "@/components/app/AppChrome";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUserFromCookies();
  if (!user) redirect("/login?from=/admin");
  if (user.role !== "ADMIN") redirect("/patient/dashboard");

  return (
    <AppChrome
      user={{ name: user.name, email: user.email, role: user.role }}
      brandTitle="Aegis"
      brandHref="/admin/dashboard"
      brandSubtitle="Admin console"
      navItems={[
        { href: "/admin/dashboard", label: "Dashboard" },
        { href: "/admin/users", label: "Users", matchPrefix: true },
        { href: "/admin/records", label: "Records", matchPrefix: true },
        { href: "/admin/reminders", label: "Reminders", matchPrefix: true },
        { href: "/admin/audit", label: "Audit", matchPrefix: true },
      ]}
    >
      {children}
    </AppChrome>
  );
}

