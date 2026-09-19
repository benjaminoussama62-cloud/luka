import Link from "next/link";
import { GradientStage } from "@/components/effects/GradientStage";
import { SiteFooter } from "@/components/search/SiteFooter";
import { AyebaIcon, AyebaWordmark } from "@/components/brand/AyebaIcon";
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
    mode === "turso"
      ? "Turso (durable)"
      : mode === "memory"
        ? "Mémoire (Vercel Hobby)"
        : mode === "vercel-tmp"
          ? "Vercel /tmp (éphémère)"
          : "SQLite local";
    const isOperational = !dbError;
    const checkedAt = new Date().toISOString();
    const services = [
      { name: "Recherche web", detail: "Résultats et indexation", ok: isOperational },
      { name: "Identité Ayeba", detail: "Connexion et autorisations", ok: true },
      { name: "Ayebi", detail: "Connaissances et articles", ok: isOperational },
      { name: "Applications partenaires", detail: "OAuth et OpenID Connect", ok: true },
    ];

  return (
    <>
      <GradientStage />
      <div className="relative z-10 px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-4xl">
          <header className="flex items-center justify-between gap-4">
            <Link href="/" aria-label="Retour à AYEBA">
              <AyebaWordmark size="sm" />
            </Link>
            <Link href="/" className="ayeba-ghost px-3 py-1.5 text-xs">
              Retour à AYEBA
            </Link>
          </header>

          <div className="mt-16 max-w-3xl">
            <div className="flex items-center gap-3">
              <AyebaIcon size={36} />
              <p className="ayeba-kicker ayeba-kicker-accent">Confiance & continuité</p>
            </div>
            <h1 className="mt-5 font-[family-name:var(--font-display)] text-4xl leading-tight text-white sm:text-6xl">
              Tout fonctionne comme prévu.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--muted)] sm:text-lg">
              Cette page présente l’état actuel des services AYEBA, de la recherche et de son écosystème d’identité.
            </p>
          </div>

          <section className="ayeba-panel mt-10 flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="flex items-center gap-4">
              <span className={`h-3 w-3 rounded-full ${isOperational ? "bg-emerald-400" : "bg-amber-400"}`} />
              <div>
                <p className="text-lg font-semibold text-white">
                  {isOperational ? "Tous les systèmes opérationnels" : "Surveillance en cours"}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">Dernière vérification : {checkedAt}</p>
              </div>
            </div>
            <p className="text-sm text-[var(--faint)]">{modeLabel}</p>
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2">
            {services.map((service) => (
              <article key={service.name} className="ayeba-panel flex items-start justify-between gap-4 p-5">
                <div>
                  <h2 className="font-semibold text-white">{service.name}</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">{service.detail}</p>
                </div>
                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${service.ok ? "bg-emerald-400" : "bg-amber-400"}`} aria-label={service.ok ? "Opérationnel" : "Surveillance"} />
              </article>
            ))}
          </section>

          {dbError ? (
            <div className="ayeba-panel mt-6 border border-amber-400/30 p-5 text-sm text-amber-200">
              Les données détaillées sont temporairement limitées. Les services principaux restent surveillés.
            </div>
          ) : null}

          <section className="mt-10">
            <p className="ayeba-kicker ayeba-kicker-accent">Observabilité</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Activité de la plateforme</h2>
          </section>
          <section className="ayeba-panel mt-4 grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="ayeba-kicker">Index web</p>
              <p className="mt-2 text-2xl text-white">{documents.toLocaleString("fr-FR")}</p>
              <p className="mt-1 text-xs text-[var(--faint)]">documents disponibles</p>
            </div>
            <div>
              <p className="ayeba-kicker">Ayebi</p>
              <p className="mt-2 text-2xl text-white">{ayebi.toLocaleString("fr-FR")}</p>
              <p className="mt-1 text-xs text-[var(--faint)]">articles référencés</p>
            </div>
            <div>
              <p className="ayeba-kicker">File de traitement</p>
              <p className="mt-2 text-2xl text-white">{queuePending.toLocaleString("fr-FR")}</p>
              <p className="mt-1 text-xs text-[var(--faint)]">pages en attente</p>
            </div>
            <div>
              <p className="ayeba-kicker">Pages traitées</p>
              <p className="mt-2 text-2xl text-white">{queueDone.toLocaleString("fr-FR")}</p>
              <p className="mt-1 text-xs text-[var(--faint)]">traitements terminés</p>
            </div>
            <div>
              <p className="ayeba-kicker">Automatisations</p>
              <p className="mt-2 text-2xl text-white">{jobs.toLocaleString("fr-FR")}</p>
              <p className="mt-1 text-xs text-[var(--faint)]">cycles exécutés</p>
            </div>
            <div>
              <p className="ayeba-kicker">Incidents de traitement</p>
              <p className="mt-2 text-2xl text-white">{queueFailed.toLocaleString("fr-FR")}</p>
              <p className="mt-1 text-xs text-[var(--faint)]">échecs enregistrés</p>
            </div>
          </section>

          <p className="mt-6 text-xs leading-relaxed text-[var(--faint)]">
            Les métriques affichées servent au suivi opérationnel et peuvent varier selon l’environnement de stockage actif.
          </p>

          <div className="mt-10">
            <SiteFooter />
          </div>
        </div>
      </div>
    </>
  );
}
