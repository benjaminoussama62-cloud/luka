import { createHash } from "crypto";
import { getDb } from "@/lib/storage/database";
import { getArticle } from "./db-sqlite";
import type { AyebiArticle, AyebiCitation } from "./types";

const LANGUAGES = new Set(["fr", "en", "sw", "ln", "kg", "es", "pt"]);

function ownerOf(userId: string, slug?: string) {
  if (!slug) return true;
  const article = getArticle(slug);
  return Boolean(article && (article.updatedBy === userId || userId === "system"));
}

export function listCategories() {
  return getDb().prepare("SELECT id, parent_id as parentId, slug, label, description, sort_order as sortOrder FROM ayebi_categories ORDER BY sort_order, label").all();
}

export function createCategory(input: { parentId?: string; slug: string; label: string; description?: string }) {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  getDb().prepare("INSERT INTO ayebi_categories (id, parent_id, slug, label, description, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
    id, input.parentId || null, input.slug.trim(), input.label.trim(), input.description?.trim() || "", now,
  );
  return { id, ...input, createdAt: now };
}

export function listTemplates() {
  return getDb().prepare("SELECT id, name, description, schema_json as schema, required_fields_json as requiredFields, created_by as createdBy, created_at as createdAt, updated_at as updatedAt FROM ayebi_templates ORDER BY name").all();
}

export function createTemplate(input: { name: string; description?: string; schema: Record<string, unknown>; requiredFields: string[]; userId: string }) {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  getDb().prepare("INSERT INTO ayebi_templates (id, name, description, schema_json, required_fields_json, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
    id, input.name.trim(), input.description?.trim() || "", JSON.stringify(input.schema), JSON.stringify(input.requiredFields), input.userId, now, now,
  );
  return { id, name: input.name.trim(), createdAt: now };
}

export function validateTemplate(templateId: string, article: Partial<AyebiArticle>) {
  const row = getDb().prepare("SELECT required_fields_json FROM ayebi_templates WHERE id = ?").get(templateId) as { required_fields_json: string } | undefined;
  if (!row) return { valid: false, errors: ["Template introuvable."] };
  const errors = (JSON.parse(row.required_fields_json) as string[]).filter((field) => {
    const value = article[field as keyof AyebiArticle];
    return value === undefined || value === null || (typeof value === "string" && !value.trim()) || (Array.isArray(value) && value.length === 0);
  }).map((field) => `Champ requis manquant: ${field}`);
  return { valid: errors.length === 0, errors };
}

export async function translateArticle(slug: string, language: string, userId: string) {
  if (!LANGUAGES.has(language)) throw new Error("Langue non supportée.");
  const source = getArticle(slug);
  if (!source) throw new Error("Article introuvable.");
  const endpoint = process.env.LIBRETRANSLATE_URL?.trim();
  if (!endpoint) throw new Error("LIBRETRANSLATE_URL doit être configuré pour lancer une traduction réelle.");
  const text = [source.title, source.subtitle, source.summary, ...(source.body || [])].join("\n");
  const response = await fetch(`${endpoint.replace(/\/$/, "")}/translate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ q: text, source: "auto", target: language, format: "text", api_key: process.env.LIBRETRANSLATE_API_KEY }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Service de traduction indisponible (${response.status}).`);
  const payload = (await response.json()) as { translatedText?: string };
  if (!payload.translatedText) throw new Error("Réponse de traduction invalide.");
  const lines = payload.translatedText.split("\n");
  const now = new Date().toISOString();
  getDb().prepare("INSERT INTO ayebi_translations (slug, language, title, subtitle, summary, content_json, status, translator_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'machine', ?, ?) ON CONFLICT(slug, language) DO UPDATE SET title=excluded.title, subtitle=excluded.subtitle, summary=excluded.summary, content_json=excluded.content_json, status=excluded.status, translator_id=excluded.translator_id, updated_at=excluded.updated_at").run(
    slug, language, lines[0] || source.title, lines[1] || source.subtitle, lines[2] || source.summary, JSON.stringify({ body: lines.slice(3) }), userId, now,
  );
  return { slug, language, status: "machine", updatedAt: now };
}

export function getTranslation(slug: string, language: string) {
  return getDb().prepare("SELECT slug, language, title, subtitle, summary, content_json as content, status, translator_id as translatorId, updated_at as updatedAt FROM ayebi_translations WHERE slug = ? AND language = ?").get(slug, language);
}

export function addCitation(slug: string, revision: number, citation: AyebiCitation, userId: string) {
  if (!ownerOf(userId, slug)) throw new Error("Seul l’auteur de la fiche peut gérer ses références.");
  const article = getArticle(slug);
  if (!article) throw new Error("Article introuvable.");
  new URL(citation.url);
  getDb().prepare("INSERT INTO ayebi_citations (id, slug, revision, citation_key, title, url, publisher, published_at, accessed_at, author, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
    crypto.randomUUID(), slug, revision, citation.key, citation.title.trim(), citation.url, citation.publisher || "", citation.publishedAt || null, new Date().toISOString(), citation.author || "", userId,
  );
  return citation;
}

export function listCitations(slug: string) {
  return getDb().prepare("SELECT citation_key as key, title, url, publisher, published_at as publishedAt, accessed_at as accessedAt, author, revision FROM ayebi_citations WHERE slug = ? ORDER BY citation_key").all(slug);
}

export function assessSpam(input: { userId: string; action: string; content: string; ip?: string }) {
  const normalized = input.content.trim().toLowerCase();
  const fingerprint = createHash("sha256").update(`${input.userId}:${normalized}`).digest("hex");
  const reasons: string[] = [];
  let score = 0;
  if (normalized.length < 8) { score += 20; reasons.push("content_trop_court"); }
  if ((normalized.match(/https?:\/\//g) || []).length > 2) { score += 35; reasons.push("liens_multiples"); }
  if (/(.)\1{7,}/.test(normalized)) { score += 25; reasons.push("répétition_anormale"); }
  const recent = getDb().prepare("SELECT COUNT(*) as count FROM ayebi_spam_events WHERE user_id = ? AND created_at > ?").get(input.userId, new Date(Date.now() - 3600000).toISOString()) as { count: number };
  if (recent.count >= 20) { score += 50; reasons.push("fréquence_excessive"); }
  getDb().prepare("INSERT INTO ayebi_spam_events (user_id, action, fingerprint, score, reasons_json, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(input.userId, input.action, fingerprint, score, JSON.stringify(reasons), new Date().toISOString());
  return { allowed: score < 60, score, reasons };
}

export function createBot(input: { name: string; ownerId: string; event: string; config: Record<string, unknown> }) {
  const id = crypto.randomUUID();
  getDb().prepare("INSERT INTO ayebi_bots (id, name, owner_id, event, config_json, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(id, input.name.trim(), input.ownerId, input.event, JSON.stringify(input.config), new Date().toISOString());
  return { id, name: input.name.trim(), event: input.event };
}

export function listBots(ownerId: string) {
  return getDb().prepare("SELECT id, name, event, config_json as config, active, last_run_at as lastRunAt, created_at as createdAt FROM ayebi_bots WHERE owner_id = ? ORDER BY created_at DESC").all(ownerId);
}

export async function runBot(id: string, ownerId: string) {
  const bot = getDb().prepare("SELECT event, config_json FROM ayebi_bots WHERE id = ? AND owner_id = ? AND active = 1").get(id, ownerId) as { event: string; config_json: string } | undefined;
  if (!bot) return null;
  const now = new Date().toISOString();
  getDb().prepare("UPDATE ayebi_bots SET last_run_at = ? WHERE id = ?").run(now, id);
  const config = JSON.parse(bot.config_json) as { action?: string; slug?: string; language?: string; content?: string };
  let result: unknown;
  if (config.action === "translate" && config.slug && config.language) {
    result = await translateArticle(config.slug, config.language, ownerId);
  } else if (config.action === "spam_scan" && config.content) {
    result = assessSpam({ userId: ownerId, action: `bot:${bot.event}`, content: config.content });
  } else {
    throw new Error("Action de bot non supportée ou paramètres manquants.");
  }
  return { id, event: bot.event, action: config.action, result, startedAt: now, completedAt: new Date().toISOString() };
}
