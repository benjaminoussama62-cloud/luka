/**
 * Enregistre les réponses réelles Wikipedia/Wikidata comme fixtures de test.
 * Relancer quand la logique de question-answer change :
 *   npx tsx scripts/record-qa-fixtures.ts
 * Sortie : tests/fixtures/qa-http.json (URL → status + body).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { answerQuestion, fetchWikiAnswer } from "../src/lib/question-answer";
import { parseSearchIntent } from "../src/lib/query-intent";

const OUT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "tests",
  "fixtures",
  "qa-http.json",
);

const records: Record<string, { status: number; contentType: string; body: string }> = {};
const original = globalThis.fetch;
globalThis.fetch = (async (input: unknown, init?: unknown) => {
  const url =
    typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
  const res = await original(input as never, init as never);
  try {
    records[url] = {
      status: res.status,
      contentType: res.headers.get("content-type") ?? "",
      body: await res.clone().text(),
    };
  } catch {
    /* body non lisible — la réponse reste valide pour le code */
  }
  return res;
}) as typeof fetch;

async function run(name: string, fn: () => Promise<unknown>) {
  try {
    const r = await fn();
    console.log(`${r ? "OK  " : "NULL"} ${name}`);
  } catch (e) {
    console.log(`ERR  ${name} — ${e instanceof Error ? e.message : e}`);
  }
}

async function main() {
  await run("fetchWikiAnswer vladimir putin", () => fetchWikiAnswer("vladimir putin"));

  const queries = [
    "quel est le president de la rdc",
    "dans quel commune c trouve la bcdc",
    "quand est né poutine",
    "qui est vladimir putin ?",
    "quelle est la capitale du japon",
    "combien d'habitants a la rdc",
    "ou est mort khadafi ?",
    "comment est mort khadafi",
    "qui a fondé apple",
    "quelle est la monnaie de la rdc",
    "udps est cree par qui ?",
    "quel est l'ancien appellation de kinshasa",
    "minsk fete son quatrieme anniversaire",
    "qui fut le premier ministre ougandais",
    "quelle est la capitale ougandaise",
    "qui est la premiere dame de france",
    "qui est le maire de kinshasa",
    "qui est le dirigeant chinois",
  ];
  for (const q of queries) {
    const intent = parseSearchIntent(q);
    if (intent.kind !== "question") {
      console.log(`SKIP ${q} → intent ${intent.kind}`);
      continue;
    }
    await run(q, () => answerQuestion(intent));
  }

  await run("mali subdivisions_count", () =>
    answerQuestion({
      qtype: "howmany",
      subject: "Mali",
      wikiQuery: "Mali",
      attr: "nombre de provinces",
      attrKey: "subdivisions_count",
      entityType: "country",
    }),
  );
  await run("russie officeholder", () =>
    answerQuestion({
      qtype: "who",
      subject: "Russie",
      wikiQuery: "Russie",
      attr: "ministre des affaires étrangères",
      attrEn: "minister of foreign affairs",
      entityEn: "Russia",
      attrKey: "officeholder",
      entityType: "country",
    }),
  );
  await run("poutine age", () =>
    answerQuestion({
      qtype: "howmany",
      subject: "Vladimir Poutine",
      wikiQuery: "Vladimir Poutine",
      attr: "âge",
      attrKey: "age",
      entityType: "person",
    }),
  );
  await run("mali ru", () =>
    answerQuestion({
      qtype: "howmany",
      subject: "Мали",
      wikiQuery: "Мали",
      attrKey: "subdivisions_count",
      entityType: "country",
      lang: "ru",
    }),
  );
  await run("chaussure concept", () =>
    answerQuestion({
      qtype: "what",
      subject: "chaussure",
      wikiQuery: "chaussure",
      entityType: "concept",
    }),
  );

  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(records));
  console.log(`\n${Object.keys(records).length} réponses enregistrées → ${OUT}`);
}

void main();
