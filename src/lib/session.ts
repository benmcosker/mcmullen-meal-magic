import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "./auth";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

/** The signed-in user, or null. Safe to call from any server component. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

/**
 * The signed-in user, or a redirect to sign-in.
 *
 * Use this to guard anything that writes - uploads, edits, planning. Reading
 * the library only requires an account, not ownership: every recipe is visible
 * to everyone who is signed in.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}
