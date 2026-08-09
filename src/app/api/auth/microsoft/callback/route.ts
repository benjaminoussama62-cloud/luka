import { NextResponse } from "next/server";
import {
  createSessionToken,
  setSessionCookie,
  upsertOAuthUser,
} from "@/lib/auth-server";
import { oauthRedirectUri, appBaseUrl } from "@/lib/oauth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const base = appBaseUrl();

  if (!code) return NextResponse.redirect(`${base}/?auth=failed`);

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenant = process.env.MICROSOFT_TENANT_ID || "common";
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${base}/?auth=config`);
  }

  try {
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: oauthRedirectUri("microsoft"),
          grant_type: "authorization_code",
        }),
      },
    );
    if (!tokenRes.ok) throw new Error("Microsoft token failed");
    const tokens = (await tokenRes.json()) as { access_token?: string };
    if (!tokens.access_token) throw new Error("No token");

    const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileRes.ok) throw new Error("Profile failed");
    const profile = (await profileRes.json()) as {
      id: string;
      displayName?: string;
      mail?: string;
      userPrincipalName?: string;
    };

    const email = (profile.mail || profile.userPrincipalName || "").toLowerCase();
    if (!email) throw new Error("No email");

    const user = await upsertOAuthUser({
      provider: "microsoft",
      sub: profile.id,
      email,
      name: profile.displayName || email.split("@")[0],
    });
    await setSessionCookie(await createSessionToken(user));
    return NextResponse.redirect(`${base}/?auth=ok`);
  } catch (e) {
    console.error(e);
    return NextResponse.redirect(`${base}/?auth=failed`);
  }
}
