/** Base URL publique Ayeba — tolère les valeurs .env invalides au build. */
export function siteBaseUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://ayeba.app";
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("bad protocol");
    return u.origin;
  } catch {
    return "https://ayeba.app";
  }
}

export function siteMetadataBase() {
  return new URL(siteBaseUrl());
}
