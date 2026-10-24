import { getSessionFromCookies, isAyebaAccount, type SessionUser } from "@/lib/auth-server";

export async function requireDeveloperSession(): Promise<
  { user: SessionUser } | { error: Response }
> {
  const user = await getSessionFromCookies();
  if (!user || !isAyebaAccount(user)) {
    return {
      error: Response.json(
        { error: user ? "Compte Ayeba requis" : "Connexion requise", code: "ayeba_account_required" },
        { status: user ? 403 : 401 },
      ),
    };
  }
  return { user };
}
