import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Replay déterministe des réponses HTTP capturées (Wikipedia, Wikidata…).
 * Les fixtures sont enregistrées par `scripts/record-qa-fixtures.ts` —
 * elles contiennent les vraies réponses, rejouées à l'identique.
 *
 * Mode auto-complétion : RECORD_FIXTURES=1 npx vitest run <test>
 * → les URLs absentes sont fetchées pour de vrai puis fusionnées au fichier.
 * Utile quand une branche du pipeline n'a pas été couverte par l'enregistreur
 * (chemins alternatifs déclenchés par les timeouts des races réseau).
 */
type FixtureEntry = { status: number; contentType: string; body: string };

/**
 * Canonise une URL pour la clé de fixture : les batchs wbgetentities
 * (`ids=A|B|C`) reçoivent leurs IDs dans un ordre qui dépend de la course
 * des promesses — trier rend la clé déterministe. La réponse Wikidata est
 * identique quel que soit l'ordre des ids.
 */
export function canonicalFixtureUrl(url: string): string {
  try {
    const u = new URL(url);
    const ids = u.searchParams.get("ids");
    if (!ids || !ids.includes("|")) return url;
    const uniqueSorted = [...new Set(ids.split("|").filter(Boolean))].sort();
    return `${u.origin}${u.pathname}?${u.searchParams
      .toString()
      .replace(/ids=[^&]+/, `ids=${uniqueSorted.join("|")}`)}`;
  } catch {
    return url;
  }
}

const FIXTURE_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "fixtures",
  "qa-http.json",
);

const RECORD = process.env.RECORD_FIXTURES === "1";
const misses: string[] = [];
let records: Record<string, FixtureEntry> = {};

export function installQaFixtures(): () => void {
  misses.length = 0;
  const stored = existsSync(FIXTURE_PATH)
    ? (JSON.parse(readFileSync(FIXTURE_PATH, "utf-8")) as Record<string, FixtureEntry>)
    : {};
  // Index canonique — les batchs ids= enregistrés dans un ordre différent
  // matchent quand même.
  records = {};
  for (const [k, v] of Object.entries(stored)) records[canonicalFixtureUrl(k)] = v;
  const original = globalThis.fetch;

  globalThis.fetch = (async (input: unknown, init?: unknown) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof Request
          ? input.url
          : String(input);
    const key = canonicalFixtureUrl(url);
    const hit = records[key];
    if (hit) {
      return new Response(hit.body, {
        status: hit.status,
        headers: { "content-type": hit.contentType || "application/json" },
      });
    }
    misses.push(url);
    if (!RECORD) {
      return new Response("fixture-miss", { status: 503 });
    }
    // Enregistrement à la volée : vraie réponse capturée et fusionnée.
    // Le AbortSignal du code est désarmé — sinon les fetchs live lents
    // timeout comme en prod et la fixture n'est jamais écrite.
    const res = await original(
      input as never,
      { ...(init as RequestInit), signal: null } as never,
    );
    try {
      records[key] = {
        status: res.status,
        contentType: res.headers.get("content-type") ?? "",
        body: await res.clone().text(),
      };
    } catch {
      /* réponse sans corps lisible — non persistée */
    }
    return res;
  }) as typeof fetch;

  return () => {
    globalThis.fetch = original;
  };
}

/** Persiste les URLs capturées en mode RECORD_FIXTURES=1 (no-op sinon). */
export function flushQaFixtures(): void {
  if (!RECORD || !Object.keys(records).length) return;
  mkdirSync(path.dirname(FIXTURE_PATH), { recursive: true });
  writeFileSync(FIXTURE_PATH, JSON.stringify(records));
}

/** URLs demandées par le code mais absentes des fixtures → fuite réseau. */
export function fixtureMisses(): string[] {
  return [...new Set(misses)];
}
