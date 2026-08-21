import { redirect } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/session";

export default async function SignInPage() {
  if (await getCurrentUser()) redirect("/recipes");

  return (
    <AppShell>
      <AuthForm mode="sign-in" />
    </AppShell>
  );
}
