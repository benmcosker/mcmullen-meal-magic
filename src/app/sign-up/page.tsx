import { redirect } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/session";

/** An invite link carries its code in the query string: /sign-up?code=ABC123 */
export default async function SignUpPage({
  searchParams,
}: PageProps<"/sign-up">) {
  if (await getCurrentUser()) redirect("/recipes");

  const { code } = await searchParams;
  const initialInviteCode = typeof code === "string" ? code.toUpperCase() : "";

  return (
    <AppShell>
      <AuthForm mode="sign-up" initialInviteCode={initialInviteCode} />
    </AppShell>
  );
}
