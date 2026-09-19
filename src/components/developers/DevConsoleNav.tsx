import Link from "next/link";

const TABS = [
  { href: "/developers/console", label: "Aperçu", exact: true },
  { href: "/developers/console/oauth", label: "OAuth / OIDC", exact: false },
  { href: "/developers/console/cles", label: "Clés API", exact: false },
  { href: "/developers/console/utilisation", label: "Utilisation", exact: false },
  { href: "/developers/console/journaux", label: "Journaux", exact: false },
];

export function DevConsoleNav({ active }: { active: string }) {
  return (
    <nav className="mb-6 flex flex-wrap gap-2" aria-label="Console développeur">
      {TABS.map((t) => {
        const on = t.exact ? active === t.href : active.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`ayeba-ghost px-3 py-1.5 text-xs ${on ? "!border-[var(--accent)] !text-[var(--ink)]" : ""}`}
            aria-current={on ? "page" : undefined}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
