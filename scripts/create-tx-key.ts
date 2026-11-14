/**
 * Provisionne une clé API transactionnelle pour une app de l'écosystème.
 *
 *   node --env-file=.env.local --import tsx scripts/create-tx-key.ts -- <app> [label]
 *
 * Exemple : create-tx-key.ts -- tala "TALA production"
 *
 * La clé est affichée UNE SEULE FOIS — seul son hash SHA-256 est stocké.
 * Écrit directement dans la base configurée (Turso en prod via .env.local).
 */
import { currentDbMode } from "../src/lib/storage/database";
import { adb } from "../src/lib/storage/adb";
import { ensureMailTxReadyAsync } from "../src/lib/mail/mail-schema";
import { createApiKey, revokeApiKey } from "../src/lib/mail/transactional";

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const revokeIdx = args.indexOf("--revoke");
  if (revokeIdx >= 0) {
    const id = args[revokeIdx + 1];
    if (!id) {
      console.error("Usage: --revoke <keyId>");
      process.exit(1);
    }
    await revokeApiKey(id);
    console.log(`clé ${id} révoquée.`);
    return;
  }

  const app = args[0] as Parameters<typeof createApiKey>[0];
  const label = args[1] || `${app} production`;
  await ensureMailTxReadyAsync(adb());

  const res = await createApiKey(app, label);
  if ("error" in res) {
    console.error(`Erreur : ${res.error}`);
    process.exit(1);
  }

  console.log(`Mode DB : ${currentDbMode()}`);
  console.log(`App     : ${app}`);
  console.log(`Key ID  : ${res.id}`);
  console.log(`\nAYEBA_MAIL_KEY=${res.key}\n`);
  console.log("⚠ Copiez cette clé maintenant — elle ne sera plus jamais affichée.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
