// .env.local configure Turso/Vercel en dev — le test doit tourner sur le
// sqlite local hermétique. Chaque fichier vitest a son propre worker → sûr.
for (const k of [
  "TURSO_DATABASE_URL",
  "TURSO_AUTH_TOKEN",
  "VERCEL",
  "VERCEL_ENV",
  "AWS_LAMBDA_FUNCTION_NAME",
]) {
  delete process.env[k];
}

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import {
  enqueueStaleDocuments,
  enqueueUrl,
  runCrawlBatch,
} from "@/lib/crawler/global-crawler";
import { searchIndex } from "@/lib/search-index/fts";
import { getDb } from "@/lib/storage/database";
import { SISTER_SEARCH_DOCS } from "@/lib/sister-search";

/**
 * Pipeline crawl→index→recherche de bout en bout, hermétique : un serveur
 * HTTP local sert robots.txt + pages liées — zéro réseau externe.
 */

let server: Server;
let base: string;
let queueIdFloor = 0;
let jobIdFloor = 0;

const page = (title: string, body: string, links = "") =>
  `<html><head><title>${title}</title></head><body><main><p>${body}</p>${links}</main></body></html>`;

function routes(url: string): { status: number; body: string } {
  switch (url) {
    case "/robots.txt":
      return { status: 200, body: "User-agent: *\nDisallow: /private" };
    case "/page-a":
      return {
        status: 200,
        body: page(
          "Kinshasa Capitale RDC",
          "Kinshasa est la capitale de la République démocratique du Congo, ville de quinze millions d'habitants au bord du fleuve Congo.",
          `<a href="/page-b">Université de Kinshasa</a><a href="/private/x">zone privée</a>`,
        ),
      };
    case "/page-b":
      return {
        status: 200,
        body: page(
          "Université de Kinshasa — UNIKIN",
          "L'Université de Kinshasa est la principale université publique de la RDC, située dans la commune de Lemba.",
        ),
      };
    case "/private/x":
      return { status: 200, body: page("Zone privée", "contenu interdit par robots.txt") };
    case "/cassée":
      return { status: 500, body: "boom" };
    default:
      return { status: 404, body: "not found" };
  }
}

beforeAll(async () => {
  const db = getDb();
  queueIdFloor =
    (db.prepare("SELECT COALESCE(MAX(id),0) m FROM crawl_queue").get() as { m: number }).m;
  jobIdFloor =
    (db.prepare("SELECT COALESCE(MAX(id),0) m FROM job_runs").get() as { m: number }).m;

  server = createServer((req, res) => {
    const r = routes(req.url ?? "/");
    res.writeHead(r.status, { "content-type": "text/html; charset=utf-8" });
    res.end(r.body);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  const db = getDb();
  // Restaure l'état : lignes créées par le test uniquement.
  db.prepare("DELETE FROM crawl_queue WHERE id > ?").run(queueIdFloor);
  db.prepare("DELETE FROM job_runs WHERE id > ?").run(jobIdFloor);
  db.prepare("DELETE FROM crawl_documents WHERE url LIKE 'http://127.0.0.1%'").run();
  db.prepare("DELETE FROM search_fts WHERE url LIKE 'http://127.0.0.1%'").run();
  db.prepare("DELETE FROM document_links WHERE source_url LIKE 'http://127.0.0.1%'").run();
  for (const s of SISTER_SEARCH_DOCS) {
    db.prepare("DELETE FROM crawl_documents WHERE id = ?").run(s.id);
    db.prepare("DELETE FROM search_fts WHERE doc_id = ?").run(s.id);
  }
});

describe("crawler — pipeline e2e hermétique", () => {
  it("crawl une page, l'indexe et la rend cherchable", async () => {
    enqueueUrl(`${base}/page-a`, 9999);
    // maxPages borné à nos URLs — au-delà, les mega-seeds (priorité 100)
    // seraient fetchés en live et le test ne serait plus hermétique.
    const r = await runCrawlBatch(1);
    expect(r.indexed).toBeGreaterThanOrEqual(1);

    const hits = searchIndex("kinshasa capitale congo", 10);
    expect(hits.map((h) => h.url)).toContain(`${base}/page-a`);
  }, 15000);

  it("découvre les liens sortants et les met en file", async () => {
    const db = getDb();
    const row = db
      .prepare("SELECT status FROM crawl_queue WHERE url = ?")
      .get(`${base}/page-b`) as { status: string } | undefined;
    expect(row).toBeTruthy();
    // Lien vers la zone privée aussi découvert — c'est robots.txt qui bloquera.
    const priv = db
      .prepare("SELECT status FROM crawl_queue WHERE url = ?")
      .get(`${base}/private/x`) as { status: string } | undefined;
    expect(priv).toBeTruthy();
  });

  it("le graphe de liens est persisté (document_links)", () => {
    const db = getDb();
    const edge = db
      .prepare("SELECT target_url FROM document_links WHERE source_url = ? AND target_url = ?")
      .get(`${base}/page-a`, `${base}/page-b`);
    expect(edge).toBeTruthy();
  });

  it("crawl la page découverte au batch suivant + respecte robots.txt", async () => {
    const db = getDb();
    db.prepare("UPDATE crawl_queue SET priority = 9999 WHERE url = ?").run(`${base}/page-b`);
    db.prepare("UPDATE crawl_queue SET priority = 9998 WHERE url = ?").run(`${base}/private/x`);
    const r = await runCrawlBatch(2);
    expect(r.indexed).toBeGreaterThanOrEqual(1);

    expect(searchIndex("université kinshasa lemba", 10).map((h) => h.url)).toContain(
      `${base}/page-b`,
    );

    const priv = db
      .prepare("SELECT status, last_error FROM crawl_queue WHERE url = ?")
      .get(`${base}/private/x`) as { status: string; last_error: string };
    expect(priv.status).toBe("skipped");
    expect(priv.last_error).toBe("robots");
  }, 15000);

  it("une page en échec HTTP est marquée failed, pas perdue", async () => {
    const db = getDb();
    enqueueUrl(`${base}/cassée`, 9999);
    await runCrawlBatch(1);
    const row = db
      .prepare("SELECT status, attempts FROM crawl_queue WHERE url = ?")
      .get(`${base}/cassée`) as { status: string; attempts: number };
    expect(row.status).toBe("failed");
    expect(row.attempts).toBeGreaterThanOrEqual(1);
  });

  it("les documents périmés retournent en file (recrawl_after consommé)", () => {
    const db = getDb();
    db.prepare("UPDATE crawl_documents SET recrawl_after = ? WHERE url = ?").run(
      new Date(Date.now() - 86400000).toISOString(),
      `${base}/page-a`,
    );
    const n = enqueueStaleDocuments();
    expect(n).toBeGreaterThanOrEqual(1);
    const row = db
      .prepare("SELECT status FROM crawl_queue WHERE url = ? ORDER BY id DESC LIMIT 1")
      .get(`${base}/page-a`) as { status: string };
    expect(row.status).toBe("pending");
  });
});
