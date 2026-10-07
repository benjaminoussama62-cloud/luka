import {
  bytesToB64,
  createContentKey,
  encryptBytes,
  encryptUtf8,
  MAX_ATTACHMENTS,
  MAX_PLAIN_BYTES,
  wrapContentKey,
  type CipherPack,
  type KeyWrap,
  type VaultSession,
} from "@/lib/mail/e2ee";

export type SendOutcome = {
  ok?: boolean;
  delivered?: string[];
  bounced?: { address: string; reason: string }[];
  error?: string;
};

const MAIL_DOMAIN = "ayeba.app";

function splitRecipients(raw: string): string[] {
  return [...new Set(raw.split(/[,;\s]+/).map((t) => t.trim().toLowerCase()).filter(Boolean))];
}

async function uploadCipher(fileIv: string, nameIv: string, nameCt: string, bytes: Uint8Array): Promise<string> {
  const res = await fetch("/api/mail/blobs", {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "x-file-iv": fileIv,
      "x-name-iv": nameIv,
      "x-name-ct": nameCt,
    },
    body: bytes as BufferSource,
  });
  const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
  if (!res.ok || !data.id) throw new Error(data.error || "Envoi de la pièce jointe impossible.");
  return data.id;
}

export async function sendSealedMessage(opts: {
  session: VaultSession;
  selfEmail: string;
  toRaw: string;
  subject: string;
  body: string;
  files: File[];
  externalAck: boolean;
  draft?: boolean;
}): Promise<SendOutcome> {
  const to = splitRecipients(opts.toRaw);
  if (!opts.draft && !to.length) return { error: "Ajoutez un destinataire." };
  if (to.length > 20) return { error: "Trop de destinataires." };
  if (opts.files.length > MAX_ATTACHMENTS) return { error: "3 pièces jointes maximum." };
  for (const f of opts.files) {
    if (f.size <= 0) return { error: `${f.name || "Fichier"} est vide.` };
    if (f.size > MAX_PLAIN_BYTES) return { error: `${f.name} dépasse 3 Mo.` };
  }

  const internals = to.filter((e) => e.endsWith(`@${MAIL_DOMAIN}`));
  const externals = to.filter((e) => !e.endsWith(`@${MAIL_DOMAIN}`));
  if (externals.length && !opts.externalAck && !opts.draft) {
    return { error: "Confirmez l'envoi hors coffre pour les adresses externes." };
  }

  let keys: { email: string; status: string; ecdhPublic?: string }[] = [];
  if (internals.length && !opts.draft) {
    const res = await fetch("/api/mail/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emails: internals }),
    });
    const data = (await res.json()) as { keys?: typeof keys; error?: string };
    if (!res.ok) return { error: data.error || "Impossible de vérifier les coffres." };
    keys = data.keys || [];
    const blocked = keys.find((k) => k.status !== "ok" || !k.ecdhPublic);
    if (blocked) {
      if (blocked.status === "missing") return { error: `${blocked.email} n'existe pas sur Ayeba Mail.` };
      return { error: `${blocked.email} n'a pas encore activé le coffre. L'envoi de bout en bout est impossible.` };
    }
  }

  const { raw, key } = await createContentKey();
  try {
    const subjectCipher: CipherPack = await encryptUtf8(key, opts.subject.trim() || "(sans objet)");
    const bodyCipher: CipherPack = await encryptUtf8(key, opts.body);
    const wraps: Record<string, KeyWrap> = {
      [opts.selfEmail]: await wrapContentKey(opts.session.ecdhPublic, raw),
    };
    if (!opts.draft) {
      for (const k of keys) {
        if (k.ecdhPublic) wraps[k.email] = await wrapContentKey(k.ecdhPublic, raw);
      }
    }

    const blobIds: string[] = [];
    const externalFiles: { name: string; mime: string; data: string }[] = [];
    for (const file of opts.files) {
      const plain = new Uint8Array(await file.arrayBuffer());
      const namePack = await encryptUtf8(
        key,
        JSON.stringify({
          name: file.name.slice(0, 180) || "piece-jointe",
          mime: file.type || "application/octet-stream",
        }),
      );
      const enc = await encryptBytes(key, plain);
      blobIds.push(await uploadCipher(enc.iv, namePack.iv, namePack.ct, enc.ct));
      if (externals.length && opts.externalAck) {
        externalFiles.push({
          name: file.name.slice(0, 180) || "piece-jointe",
          mime: file.type || "application/octet-stream",
          data: bytesToB64(plain),
        });
      }
    }

    const res = await fetch("/api/mail/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sealed: true,
        draft: !!opts.draft,
        to,
        subjectCipher,
        bodyCipher,
        wraps,
        blobIds,
        externalAck: opts.externalAck,
        external: externals.length && opts.externalAck
          ? { subject: opts.subject, body: opts.body, files: externalFiles }
          : undefined,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as SendOutcome;
    if (!res.ok && !data.bounced?.length) return { error: data.error || "Envoi impossible." };
    return data;
  } finally {
    raw.fill(0);
  }
}
