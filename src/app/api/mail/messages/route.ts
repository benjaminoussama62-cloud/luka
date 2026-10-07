import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { MAX_ATTACHMENTS, MAX_CIPHER_BYTES, type CipherPack, type KeyWrap } from "@/lib/mail/e2ee";
import { deliverSealedMail, getAccountByUser, getThread, listMessages } from "@/lib/mail/mail";

export async function GET(req: Request) {
  const user = await getSessionFromCookies();
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const account = getAccountByUser(user.id);
  if (!account) return NextResponse.json({ error: "no mail account" }, { status: 404 });
  if (account.status === "suspended") {
    return NextResponse.json({ error: "Compte suspendu — contactez le support." }, { status: 403 });
  }

  const url = new URL(req.url);
  const thread = url.searchParams.get("thread");
  if (thread) {
    return NextResponse.json({ messages: getThread(account.id, thread) });
  }
  const folder = url.searchParams.get("folder") || "inbox";
  const q = url.searchParams.get("q") || "";
  // Data-saver : la liste ne transporte que l'extrait (~140 car.) — le corps
  // complet n'est téléchargé qu'à l'ouverture via GET /messages/[id].
  const messages = listMessages(account.id, folder, q).map((m) => ({
    ...m,
    body: m.enc === 1 ? "" : m.body.replace(/\s+/g, " ").slice(0, 140),
    sealedBody: undefined,
    attachments: [],
  }));
  return NextResponse.json({ messages });
}

function asCipher(v: unknown, max: number): CipherPack | null {
  if (!v || typeof v !== "object") return null;
  const o = v as CipherPack;
  if (typeof o.iv !== "string" || typeof o.ct !== "string") return null;
  if (o.iv.length < 8 || o.iv.length > 40 || o.ct.length < 8 || o.ct.length > max) return null;
  return { iv: o.iv, ct: o.ct };
}

function asWrap(v: unknown): KeyWrap | null {
  if (!v || typeof v !== "object") return null;
  const o = v as KeyWrap;
  if ([o.ek, o.iv, o.ct].some((s) => typeof s !== "string" || s.length < 8 || s.length > 8000)) return null;
  return { ek: o.ek, iv: o.iv, ct: o.ct };
}

export async function POST(req: Request) {
  const user = await getSessionFromCookies();
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const account = getAccountByUser(user.id);
  if (!account) return NextResponse.json({ error: "no mail account" }, { status: 404 });
  if (account.status === "suspended") {
    return NextResponse.json({ error: "Compte suspendu — contactez le support." }, { status: 403 });
  }
  if (!rateLimit(`mail-send:${account.id}`, 60, 60_000)) return rateLimitResponse();

  const body = (await req.json().catch(() => null)) as {
    sealed?: boolean;
    draft?: boolean;
    to?: string[] | string;
    subjectCipher?: unknown;
    bodyCipher?: unknown;
    wraps?: Record<string, unknown>;
    blobIds?: string[];
    externalAck?: boolean;
    external?: { subject?: string; body?: string; files?: { name?: string; mime?: string; data?: string }[] };
  } | null;

  if (!body?.sealed) {
    return NextResponse.json(
      { error: "Envoi en clair refusé. Le message doit être chiffré dans le coffre." },
      { status: 400 },
    );
  }

  const to = Array.isArray(body.to)
    ? body.to.map((t) => String(t))
    : String(body.to || "").split(/[,;\s]+/).filter(Boolean);
  const subjectCipher = asCipher(body.subjectCipher, 20_000);
  const bodyCipher = asCipher(body.bodyCipher, 500_000);
  if (!subjectCipher || !bodyCipher) {
    return NextResponse.json({ error: "Message chiffré invalide." }, { status: 400 });
  }
  const wraps: Record<string, KeyWrap> = {};
  for (const [email, wrap] of Object.entries(body.wraps || {})) {
    const parsed = asWrap(wrap);
    if (!parsed) return NextResponse.json({ error: "Enveloppe de chiffrement invalide." }, { status: 400 });
    wraps[email.trim().toLowerCase()] = parsed;
  }
  const blobIds = Array.isArray(body.blobIds) ? body.blobIds.map((id) => String(id)).slice(0, MAX_ATTACHMENTS) : [];

  let external: { subject: string; body: string; files: { name: string; mime: string; data: Buffer }[] } | null = null;
  if (body.externalAck && body.external) {
    const files = [];
    for (const f of (body.external.files || []).slice(0, MAX_ATTACHMENTS)) {
      const data = Buffer.from(String(f.data || ""), "base64");
      if (!data.length || data.length > MAX_CIPHER_BYTES) {
        return NextResponse.json({ error: "Pièce jointe externe trop lourde." }, { status: 413 });
      }
      files.push({
        name: String(f.name || "piece-jointe").slice(0, 120),
        mime: String(f.mime || "application/octet-stream").slice(0, 120),
        data,
      });
    }
    external = {
      subject: String(body.external.subject || "").slice(0, 300),
      body: String(body.external.body || "").slice(0, 50_000),
      files,
    };
  }

  const result = await deliverSealedMail(account, {
    draft: !!body.draft,
    to,
    subjectCipher,
    bodyCipher,
    wraps,
    blobIds,
    externalAck: !!body.externalAck,
    external,
  });
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result, { status: result.ok || result.bounced.length ? 200 : 502 });
}
