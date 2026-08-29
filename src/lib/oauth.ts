export type OAuthProviderId = "google" | "github" | "microsoft" | "apple";

export type OAuthProviderMeta = {
  id: OAuthProviderId;
  label: string;
  authPath: string;
  configured: boolean;
  brandColor: string;
};

export function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function appBase() {
  return appBaseUrl();
}

export function getOAuthProviders(): OAuthProviderMeta[] {
  return [
    {
      id: "google",
      label: "Google",
      authPath: "/api/auth/google",
      configured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      brandColor: "#4285F4",
    },
    {
      id: "github",
      label: "GitHub",
      authPath: "/api/auth/github",
      configured: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
      brandColor: "#f0f6fc",
    },
    {
      id: "microsoft",
      label: "Microsoft",
      authPath: "/api/auth/microsoft",
      configured: Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
      brandColor: "#00A4EF",
    },
    {
      id: "apple",
      label: "Apple",
      authPath: "/api/auth/apple",
      configured: Boolean(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET),
      brandColor: "#f5f5f7",
    },
  ];
}

export function oauthRedirectUri(provider: OAuthProviderId) {
  return `${appBase()}/api/auth/${provider}/callback`;
}

export function providerStartUrl(provider: OAuthProviderId, extra?: { state?: string }) {
  const base = appBase();
  switch (provider) {
    case "google": {
      const clientId = process.env.GOOGLE_CLIENT_ID!;
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: oauthRedirectUri("google"),
        response_type: "code",
        scope: "openid email profile",
        access_type: "online",
        prompt: "select_account",
      });
      if (extra?.state) params.set("state", extra.state);
      return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    }
    case "github": {
      const params = new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID!,
        redirect_uri: oauthRedirectUri("github"),
        scope: "read:user user:email",
      });
      return `https://github.com/login/oauth/authorize?${params}`;
    }
    case "microsoft": {
      const tenant = process.env.MICROSOFT_TENANT_ID || "common";
      const params = new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        redirect_uri: oauthRedirectUri("microsoft"),
        response_type: "code",
        scope: "openid email profile User.Read",
        response_mode: "query",
      });
      return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params}`;
    }
    default:
      return `${base}/?auth=unsupported`;
  }
}
