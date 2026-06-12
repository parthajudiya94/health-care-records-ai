import { redirect } from "next/navigation";
import { getSessionUserFromCookies } from "@/lib/auth";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage() {
  const user = await getSessionUserFromCookies();
  if (user) {
    redirect(user.role === "ADMIN" ? "/admin/dashboard" : "/patient/dashboard");
  }
  return <RegisterForm />;
}
