import { NextResponse } from "next/server";

export const OAUTH_NO_STORE = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
} as const;

export function oauthJsonError(error: string, desc?: string, status = 400) {
  return NextResponse.json(
    { error, error_description: desc || error },
    { status, headers: OAUTH_NO_STORE },
  );
}

export function parseBasicAuth(req: Request): { clientId: string; clientSecret: string } | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return null;
  try {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const i = decoded.indexOf(":");
    if (i < 0) return null;
    return { clientId: decoded.slice(0, i), clientSecret: decoded.slice(i + 1) };
  } catch {
    return null;
  }
}

export async function readOAuthFormBody(req: Request): Promise<Record<string, string>> {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const j = (await req.json()) as Record<string, string>;
    return Object.fromEntries(Object.entries(j).map(([k, v]) => [k, String(v ?? "")]));
  }
  const fd = await req.formData();
  const out: Record<string, string> = {};
  fd.forEach((v, k) => {
    out[k] = String(v);
  });
  return out;
}
