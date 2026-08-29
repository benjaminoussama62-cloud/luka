import { NextResponse } from "next/server";
import {
  createSessionToken,
  setSessionCookie,
  upsertGoogleUser,
} from "@/lib/auth-server";
import { appBaseUrl, oauthRedirectUri } from "@/lib/oauth";
import { isAllowedOmegaReturn } from "@/lib/omega-cors";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state") || "";
  const base = appBaseUrl();

  const omegaReturn = state.startsWith("omega|") ? state.slice("omega|".length) : "";
  const backToOmega = omegaReturn && isAllowedOmegaReturn(omegaReturn) ? omegaReturn : "";

  const ayebaReturn = state.startsWith("ayeba|") ? state.slice("ayeba|".length) : "";
  const backToOAuth =
    ayebaReturn.startsWith("/oauth/authorize") ? ayebaReturn : "";

  if (error || !code) {
    if (backToOmega) return NextResponse.redirect(`${backToOmega}?ayeba_error=failed`);
    return NextResponse.redirect(`${base}/?auth=failed`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = oauthRedirectUri("google");

  if (!clientId || !clientSecret) {
    if (backToOmega) return NextResponse.redirect(`${backToOmega}?ayeba_error=config`);
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

    if (backToOmega) {
      const dest = new URL(backToOmega);
      dest.searchParams.set("ayeba_token", jwt);
      return NextResponse.redirect(dest.toString());
    }

    if (backToOAuth) {
      return NextResponse.redirect(`${base}${backToOAuth}`);
    }

    return NextResponse.redirect(`${base}/?auth=ok`);
  } catch (e) {
    console.error("[google/callback]", e);
    if (backToOmega) return NextResponse.redirect(`${backToOmega}?ayeba_error=failed`);
    return NextResponse.redirect(`${base}/?auth=failed`);
  }
}

