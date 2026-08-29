export const OAUTH_SCOPES = {
  openid: {
    label: "Identité OpenID",
    description: "Identifiant stable Ayeba (sub) pour lier votre compte entre applications.",
  },
  email: {
    label: "Adresse e-mail",
    description: "Voir votre adresse e-mail Ayeba.",
  },
  profile: {
    label: "Profil",
    description: "Voir votre nom et avatar.",
  },
} as const;

export type OAuthScopeId = keyof typeof OAUTH_SCOPES;

export function parseScopeString(raw: string): OAuthScopeId[] {
  const allowed = new Set(Object.keys(OAUTH_SCOPES));
  const parts = raw
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: OAuthScopeId[] = [];
  for (const p of parts) {
    if (allowed.has(p)) out.push(p as OAuthScopeId);
  }
  if (!out.includes("openid") && (out.includes("email") || out.includes("profile"))) {
    out.unshift("openid");
  }
  if (out.length === 0) out.push("openid", "email", "profile");
  return [...new Set(out)];
}

export function scopeToString(scopes: OAuthScopeId[]): string {
  return [...new Set(scopes)].join(" ");
}

export function describeScopes(scopes: OAuthScopeId[]) {
  return scopes.map((id) => ({ id, ...OAUTH_SCOPES[id] }));
}
