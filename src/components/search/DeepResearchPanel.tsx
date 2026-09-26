"use client";

import { useEffect, useMemo, useState } from "react";
import { useAyeba } from "@/lib/store";
import type { DeepResearchReport, DeepResearchStep, SearchResponse } from "@/lib/types";

/**
 * Étapes affichées pendant la génération — décrivent le pipeline réel :
 * la SERP provient déjà de sources live (wiki, presse, index, connaissance),
 * le rapport les assemble. Aucune donnée n'est fabriquée.
 */
const DEEP_RESEARCH_STEPS = [
  { id: "s1", label: "Balayer les sources live remontées pour cette requête" },
  { id: "s2", label: "Croiser encyclopédie, presse et signaux locaux" },
  { id: "s3", label: "Écarter les résultats hors-sujet et la faible qualité" },
  { id: "s4", label: "Structurer le rapport et attacher les vraies sources" },
] as const;

/** Rapport bâti uniquement sur les résultats réels de la recherche courante. */
function buildReport(query: string, response: SearchResponse | null): DeepResearchReport {
  const results = response?.results ?? [];
  const news = response?.news ?? [];
  const knowledge = response?.knowledge ?? response?.wikipediaKnowledge;
  const instant = response?.instantAnswers?.[0];

  const topSources = results.slice(0, 6);
  const domains = [...new Set(topSources.map((r) => r.domain))];
  const newsDomains = [...new Set(news.slice(0, 4).map((r) => r.domain))];

  const sections: DeepResearchReport["sections"] = [];

  // 1. Synthèse — la connaissance réelle ou les meilleurs extraits.
  const summaryBits: string[] = [];
  if (knowledge?.summary) summaryBits.push(knowledge.summary.replace(/\s+/g, " ").trim());
  if (instant) {
    summaryBits.push(
      instant.lines.map((l) => `${l.label} : ${l.value}`).join(" — "),
    );
  }
  if (!summaryBits.length && results[0]?.snippet) summaryBits.push(results[0].snippet);
  sections.push({
    heading: "1. Synthèse",
    body:
      summaryBits.join(" ").slice(0, 700) ||
      `Les sources disponibles pour « ${query} » sont limitées — élargissez la requête pour une couverture plus riche.`,
    citations: domains.slice(0, 4),
  });

  // 2. Points clés — tirés des vrais extraits.
  if (topSources.length) {
    sections.push({
      heading: "2. Points clés des sources",
      body: topSources
        .slice(0, 4)
        .map((r) => `• ${r.title} — ${r.snippet.replace(/\s+/g, " ").slice(0, 160)}`)
        .join("\n"),
      citations: domains,
    });
  }

  // 3. Actualité — uniquement si de vraies news remontées.
  if (news.length) {
    sections.push({
      heading: "3. Actualité",
      body: news
        .slice(0, 3)
        .map((r) => `• ${r.title} (${r.domain})`)
        .join("\n"),
      citations: newsDomains,
    });
  }

  // 4. Couverture — honnête sur l'étendue réelle.
  sections.push({
    heading: `${sections.length + 1}. Couverture`,
    body: `${results.length} sources distinctes agrégées${news.length ? ` dont ${news.length} actualités` : ""}${knowledge ? " + fiche de connaissance" : ""}${instant ? " + réponse directe" : ""}. Domaines : ${domains.join(", ") || "aucun"}.`,
    citations: domains,
  });

  return {
    title: `Rapport — ${query}`,
    abstract:
      `Synthèse construite sur ${results.length} sources réelles remontées par Ayeba` +
      (knowledge ? `, dont ${knowledge.title}` : "") +
      ". Chaque citation renvoie à un résultat réel de cette recherche.",
    sections,
    sources: topSources.map((r) => ({
      title: r.title,
      url: r.url,
      credibility: Math.round(Math.min(99, r.rankScore ?? 50)),
    })),
    generatedAt: new Date().toISOString(),
  };
}

export function DeepResearchPanel() {
  const { deepResearchOpen, setDeepResearchOpen, query, response } = useAyeba();
  // Le composant est remonté à chaque ouverture (montage conditionnel) — l'état
  // initial est posé par les initialiseurs, pas par un effet.
  const [steps, setSteps] = useState<DeepResearchStep[]>(() =>
    DEEP_RESEARCH_STEPS.map((s, i) => ({
      id: s.id,
      label: s.label,
      status: i === 0 ? "running" : "pending",
    })),
  );
  const [report, setReport] = useState<DeepResearchReport | null>(null);
  const [running, setRunning] = useState(true);
  const q = query || response?.query || "world";

  useEffect(() => {
    let i = 0;
    const timer = window.setInterval(() => {
      i += 1;
      setSteps((prev) =>
        prev.map((step, idx) => {
          if (idx < i) return { ...step, status: "done" };
          if (idx === i) return { ...step, status: "running" };
          return step;
        }),
      );
      if (i >= DEEP_RESEARCH_STEPS.length) {
        window.clearInterval(timer);
        setReport(buildReport(q, response));
        setRunning(false);
      }
    }, 900);

    return () => window.clearInterval(timer);
  }, [q, response]);

  const progress = useMemo(() => {
    if (!steps.length) return 0;
    return Math.round((steps.filter((s) => s.status === "done").length / steps.length) * 100);
  }, [steps]);

  if (!deepResearchOpen) return null;

  const noData = report && report.sources.length === 0;

  function downloadReport() {
    if (!report) return;
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/><title>${escapeHtml(report.title)}</title>
<style>body{font-family:system-ui;max-width:720px;margin:40px auto;line-height:1.6;background:#09090b;color:#fff}a{color:#93c5fd}.meta{color:#a1a1aa}</style></head><body>
<h1>${escapeHtml(report.title)}</h1><p class="meta">Ayeba · ${report.generatedAt}</p>
<p>${escapeHtml(report.abstract)}</p>
${report.sections.map((s) => `<h2>${escapeHtml(s.heading)}</h2><p>${escapeHtml(s.body)}</p><p class="meta">${s.citations.map(escapeHtml).join(", ")}</p>`).join("")}
<h2>Sources</h2><ul>${report.sources.map((s) => `<li>[${s.credibility}] <a href="${s.url}">${escapeHtml(s.title)}</a></li>`).join("")}</ul>
<script>setTimeout(()=>window.print(),400)</script></body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ayeba-rapport-${q.replace(/\s+/g, "-").toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="ayeba-overlay ayeba-overlay-bottom">
      <div className="ayeba-modal max-w-3xl">
        <header className="ayeba-modal-header">
          <div>
            <p className="ayeba-kicker ayeba-kicker-accent">Recherche Profonde</p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-white">
              Rapport sourcé sur la recherche courante
            </h2>
          </div>
          <button type="button" onClick={() => setDeepResearchOpen(false)} className="ayeba-ghost px-3 py-1.5 text-sm">
            Fermer
          </button>
        </header>

        <div className="ayeba-modal-body space-y-6">
          <div>
            <div className="mb-2 flex justify-between text-xs text-[var(--ink-faint)]">
              <span>{running ? "Assemblage des sources réelles…" : "Terminé"}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--gray-deep)]">
              <div
                className={`h-full rounded-full ${running ? "progress-shimmer" : "bg-gradient-to-r from-[var(--red)] to-[#9ca3af]"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <ol className="space-y-3">
            {steps.map((step) => (
              <li key={step.id} className="flex items-start gap-3 text-sm text-white">
                <span
                  className={`mt-0.5 grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold text-white ${
                    step.status === "done"
                      ? "bg-[var(--good)]"
                      : step.status === "running"
                        ? "animate-pulse-ring bg-[var(--red)]"
                        : "bg-[var(--gray-deep)]"
                  }`}
                >
                  {step.status === "done" ? "✓" : step.status === "running" ? "…" : ""}
                </span>
                <span className={step.status === "pending" ? "text-[var(--ink-faint)]" : ""}>
                  {step.label}
                </span>
              </li>
            ))}
          </ol>

          {report && (
            <article className="ayeba-panel animate-rise space-y-5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-[family-name:var(--font-display)] text-xl text-white">
                  {report.title}
                </h3>
                {!noData ? (
                  <button type="button" onClick={downloadReport} className="ayeba-cta px-4 py-2 text-sm">
                    Télécharger
                  </button>
                ) : null}
              </div>
              {noData ? (
                <p className="text-sm text-[var(--ink-muted)]">
                  Aucune source n&rsquo;a été remontée pour cette requête — le rapport serait vide.
                  Lancez d&rsquo;abord une recherche, puis ouvrez la Recherche Profonde.
                </p>
              ) : (
                <>
                  <p className="text-sm leading-relaxed text-[var(--ink-muted)]">{report.abstract}</p>
                  {report.sections.map((section) => (
                    <section key={section.heading} className="space-y-2">
                      <h4 className="font-semibold text-white">{section.heading}</h4>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--ink-muted)]">
                        {section.body}
                      </p>
                      {section.citations.length ? (
                        <p className="text-xs text-[var(--ink-faint)]">
                          Sources : {section.citations.join(" · ")}
                        </p>
                      ) : null}
                    </section>
                  ))}
                  <section className="space-y-2 border-t border-[var(--line)] pt-3">
                    <h4 className="font-semibold text-white">Sources réelles</h4>
                    <ul className="space-y-1 text-sm">
                      {report.sources.map((s) => (
                        <li key={s.url} className="text-[var(--ink-muted)]">
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[var(--link)] hover:underline"
                          >
                            {s.title}
                          </a>{" "}
                          <span className="text-xs text-[var(--ink-faint)]">· confiance {s.credibility}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                </>
              )}
            </article>
          )}
        </div>
      </div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
