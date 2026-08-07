import { NextResponse } from "next/server";
import {
  createSessionToken,
  setSessionCookie,
  upsertOAuthUser,
} from "@/lib/auth-server";
import { oauthRedirectUri } from "@/lib/oauth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!code) return NextResponse.redirect(`${base}/?auth=failed`);

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${base}/?auth=config`);
  }

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: oauthRedirectUri("github"),
      }),
    });
    if (!tokenRes.ok) throw new Error("GitHub token failed");
    const tokens = (await tokenRes.json()) as { access_token?: string };
    if (!tokens.access_token) throw new Error("No token");

    const profileRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: "application/vnd.github+json",
      },
    });
    if (!profileRes.ok) throw new Error("Profile failed");
    const profile = (await profileRes.json()) as {
      id: number;
      login: string;
      name?: string;
      email?: string;
    };

    let email = profile.email;
    if (!email) {
      const emailsRes = await fetch("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (emailsRes.ok) {
        const emails = (await emailsRes.json()) as { email: string; primary: boolean }[];
        email = emails.find((e) => e.primary)?.email ?? emails[0]?.email;
      }
    }
    if (!email) throw new Error("No email");

    const user = await upsertOAuthUser({
      provider: "github",
      sub: String(profile.id),
      email,
      name: profile.name || profile.login,
    });
    await setSessionCookie(await createSessionToken(user));
    return NextResponse.redirect(`${base}/?auth=ok`);
  } catch (e) {
    console.error(e);
    return NextResponse.redirect(`${base}/?auth=failed`);
  }
}
