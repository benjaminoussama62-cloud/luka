import { NextResponse } from "next/server";
import {
  createSessionToken,
  setSessionCookie,
  upsertGoogleUser,
} from "@/lib/auth-server";
import { appBaseUrl, oauthRedirectUri } from "@/lib/oauth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const base = appBaseUrl();

  if (error || !code) {
    return NextResponse.redirect(`${base}/?auth=failed`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = oauthRedirectUri("google");

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${base}/?auth=config`);
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) throw new Error(`Token exchange failed ${tokenRes.status}`);
    const tokens = (await tokenRes.json()) as { access_token?: string };
    if (!tokens.access_token) throw new Error("No access token");

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileRes.ok) throw new Error("Profile fetch failed");

    const profile = (await profileRes.json()) as {
      sub: string;
      email: string;
      name: string;
    };

    const user = await upsertGoogleUser(profile);
    const jwt = await createSessionToken(user);
    await setSessionCookie(jwt);

    return NextResponse.redirect(`${base}/?auth=ok`);
  } catch (e) {
    console.error("[google/callback]", e);
    return NextResponse.redirect(`${base}/?auth=failed`);
  }
}
