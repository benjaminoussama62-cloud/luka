import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Le navigateur desktop (electron-updater, provider "generic") ne peut pas
// utiliser /releases/latest : le repo héberge plusieurs apps (mobile, mail,
// mbongo) et "latest" n'est pas forcément une release navigateur. Cette route
// résout le tag browser-v* le plus récent via le flux Atom public, puis
// redirige latest.yml / l'installeur vers les assets GitHub correspondants.

const REPO = "benjaminoussama62-cloud/luka";
const GH = `https://github.com/${REPO}`;

let cached: { tag: string; at: number } = { tag: "", at: 0 };

async function latestBrowserTag(): Promise<string | null> {
  if (cached.tag && Date.now() - cached.at < 3600_000) return cached.tag;
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/releases?per_page=50`,
      {
        headers: {
          "User-Agent": "ayeba-updater",
          Accept: "application/vnd.github+json",
        },
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!res.ok) return cached.tag || null;
    const releases = (await res.json()) as { tag_name?: string }[];
    const tag = releases
      .map((r) => r.tag_name || "")
      .find((t) => /^browser-v\d/.test(t));
    if (!tag) return cached.tag || null;
    cached = { tag, at: Date.now() };
    return tag;
  } catch {
    return cached.tag || null;
  }
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ file: string[] }> },
) {
  const { file } = await ctx.params;
  const name = (file || []).join("/");
  const tag = await latestBrowserTag();
  if (!tag || !name) return new NextResponse("Not found", { status: 404 });
  return NextResponse.redirect(
    `${GH}/releases/download/${tag}/${name}`,
    307,
  );
}
