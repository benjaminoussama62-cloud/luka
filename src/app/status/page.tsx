import Link from "next/link";
import { GradientStage } from "@/components/effects/GradientStage";
import { SiteFooter } from "@/components/search/SiteFooter";
import { currentDbMode, getDb } from "@/lib/storage/database";
import { indexStats } from "@/lib/search-index/fts";
import { queueStats } from "@/lib/crawler/global-crawler";

export const metadata = {
  title: "Statut système — AYEBA",
  description: "Santé de l’index, de la file d’attente et de la base AYEBA.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function StatusPage() {
  let documents = 0;
  let queuePending = 0;
  let queueDone = 0;
  let queueFailed = 0;
  let jobs = 0;
  let ayebi = 0;
  let dbError: string | null = null;

  try {
    getDb();
    const index = indexStats();
    const queue = queueStats();
    documents = index.documents;
    queuePending = queue.pending;
    queueDone = queue.done;
    queueFailed = queue.failed;
    jobs = (
      getDb().prepare("SELECT COUNT(*) as c FROM job_runs").get() as { c: number }
    ).c;
    ayebi = (
      getDb().prepare("SELECT COUNT(*) as c FROM ayebi_articles").get() as { c: number }
    ).c;
  } catch (e) {
    dbError = e instanceof Error ? e.message : "Erreur base";
  }

  const mode = currentDbMode();
  const modeLabel =
    mode === "turso" ? "Turso (durable)" : mode === "vercel-tmp" ? "Vercel /tmp (éphémère)" : "SQLite local";

  return (
    <>
      <GradientStage />
      <div className="relative z-10 px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="ayeba-ghost px-3 py-1.5 text-xs">
            ← AYEBA
          </Link>
          <h1 className="mt-6 font-[family-name:var(--font-display)] text-3xl text-white">
            Statut système
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Vue opérationnelle — index de recherche, crawl, encyclopédie Ayebi.
          </p>

          {dbError ? (
            <div className="ayeba-panel mt-8 border border-red-500/40 p-6 text-sm text-red-300">
              {dbError}
            </div>
          ) : null}

          <section className="ayeba-panel mt-8 grid gap-4 p-6 sm:grid-cols-2">
            <div>
              <p className="ayeba-kicker ayeba-kicker-accent">Base</p>
              <p className="mt-2 text-lg text-white">{modeLabel}</p>
            </div>
            <div>
              <p className="ayeba-kicker">Site</p>
              <p className="mt-2 text-lg text-white">
                {process.env.NEXT_PUBLIC_SITE_URL || "https://ayeba.app"}
              </p>
            </div>
            <div>
              <p className="ayeba-kicker">Documents index</p>
              <p className="mt-2 text-2xl text-white">{documents}</p>
            </div>
            <div>
              <p className="ayeba-kicker">File crawl (pending)</p>
              <p className="mt-2 text-2xl text-white">{queuePending}</p>
            </div>
            <div>
              <p className="ayeba-kicker">Articles Ayebi</p>
              <p className="mt-2 text-2xl text-white">{ayebi}</p>
            </div>
            <div>
              <p className="ayeba-kicker">Jobs exécutés</p>
              <p className="mt-2 text-2xl text-white">{jobs}</p>
            </div>
            <div>
              <p className="ayeba-kicker">Crawl done / failed</p>
              <p className="mt-2 text-2xl text-white">
                {queueDone} / {queueFailed}
              </p>
            </div>
          </section>

          <p className="mt-6 text-xs text-[var(--faint)]">
            Pour une persistence durable en production, configurez{" "}
            <code className="text-[var(--muted)]">TURSO_DATABASE_URL</code> +{" "}
            <code className="text-[var(--muted)]">TURSO_AUTH_TOKEN</code> sur Vercel.
          </p>

          <div className="mt-10">
            <SiteFooter />
          </div>
        </div>
      </div>
    </>
  );
}
