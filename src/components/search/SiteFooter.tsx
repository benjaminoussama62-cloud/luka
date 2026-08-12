import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-6 text-center text-xs text-[var(--faint)]">
      <nav className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <Link href="/studio" className="ayeba-ghost px-2 py-1">
          Studio
        </Link>
        <span aria-hidden>·</span>
        <Link href="/telecharger" className="ayeba-ghost px-2 py-1">
          Télécharger
        </Link>
        <span aria-hidden>·</span>
        <Link href="/privacy" className="ayeba-ghost px-2 py-1">
          Confidentialité
        </Link>
        <span aria-hidden>·</span>
        <Link href="/terms" className="ayeba-ghost px-2 py-1">
          CGU
        </Link>
        <span aria-hidden>·</span>
        <Link href="/mentions-legales" className="ayeba-ghost px-2 py-1">
          Mentions
        </Link>
        <span aria-hidden>·</span>
        <Link href="/opensearch" className="ayeba-ghost px-2 py-1">
          OpenSearch
        </Link>
        <span aria-hidden>·</span>
        <Link href="/ayebi" className="ayeba-ghost px-2 py-1">
          Ayebi
        </Link>
        <span aria-hidden>·</span>
        <Link href="/marches" className="ayeba-ghost px-2 py-1">
          Marchés
        </Link>
        <span aria-hidden>·</span>
        <Link href="/legal" className="ayeba-ghost px-2 py-1">
          Légal
        </Link>
        <span aria-hidden>·</span>
        <Link href="/status" className="ayeba-ghost px-2 py-1">
          Statut
        </Link>
      </nav>
    </footer>
  );
}
