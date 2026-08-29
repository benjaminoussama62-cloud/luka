import { getSessionFromCookies, type SessionUser } from "@/lib/auth-server";

export async function requireDeveloperSession(): Promise<
  { user: SessionUser } | { error: Response }
> {
  const user = await getSessionFromCookies();
  if (!user) {
    return {
      error: Response.json({ error: "Connexion requise" }, { status: 401 }),
    };
  }
  return { user };
}
