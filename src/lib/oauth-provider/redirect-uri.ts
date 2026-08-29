export function validateRedirectUri(uri: string): { ok: true } | { ok: false; error: string } {
  const trimmed = uri.trim();
  if (!trimmed) return { ok: false, error: "URI vide" };
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "https:" && !u.hostname.endsWith("localhost") && u.hostname !== "127.0.0.1") {
      return { ok: false, error: "Redirect URI doit être HTTPS (localhost autorisé en dev)" };
    }
    if (u.hash) return { ok: false, error: "Fragment (#) interdit dans redirect URI" };
    return { ok: true };
  } catch {
    return { ok: false, error: `URI invalide : ${trimmed}` };
  }
}

export function validateRedirectUriList(uris: string[]): { ok: true } | { ok: false; error: string } {
  const list = uris.map((u) => u.trim()).filter(Boolean);
  if (list.length === 0) {
    return { ok: false, error: "Au moins une redirect URI HTTPS requise" };
  }
  for (const uri of list) {
    const check = validateRedirectUri(uri);
    if (!check.ok) return check;
  }
  return { ok: true };
}
