import Link from "next/link";

const PRIMARY = [
  { href: "/studio", label: "Studio" },
  { href: "/developers", label: "Developers" },
  { href: "/telecharger", label: "Télécharger" },
  { href: "/ayebi", label: "Ayebi" },
  { href: "/marches", label: "Marchés" },
] as const;

const LEGAL = [
  { href: "/privacy", label: "Confidentialité" },
  { href: "/terms", label: "CGU" },
  { href: "/mentions-legales", label: "Mentions" },
  { href: "/droits", label: "Droits" },
  { href: "/support", label: "Support" },
  { href: "/status", label: "Statut" },
] as const;

export function SiteFooter() {
  return (
    <footer className="ayeba-site-footer">
      <nav className="ayeba-site-footer-primary" aria-label="Navigation">
        {PRIMARY.map((l, i) => (
          <span key={l.href} className="ayeba-site-footer-item">
            {i > 0 ? <span className="ayeba-site-footer-dot" aria-hidden>·</span> : null}
            <Link href={l.href}>{l.label}</Link>
          </span>
        ))}
      </nav>
      <nav className="ayeba-site-footer-legal" aria-label="Légal">
        {LEGAL.map((l, i) => (
          <span key={l.href} className="ayeba-site-footer-item">
            {i > 0 ? <span className="ayeba-site-footer-dot" aria-hidden>·</span> : null}
            <Link href={l.href}>{l.label}</Link>
          </span>
        ))}
      </nav>
    </footer>
  );
}
