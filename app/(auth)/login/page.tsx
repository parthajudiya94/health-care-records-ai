import { safeAppPath } from "@/lib/safe-redirect";
import { LoginForm } from "./LoginForm";
import { RedirectIfAuthed } from "./RedirectIfAuthed";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from: fromQ } = await searchParams;
  const target = safeAppPath(fromQ, "/patient/dashboard");
  return (
    <>
      <RedirectIfAuthed from={target} />
      <LoginForm from={target} />
    </>
  );
}
