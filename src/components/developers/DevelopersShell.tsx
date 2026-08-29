import Link from "next/link";
import { AyebaWordmark } from "@/components/brand/AyebaIcon";
import { SiteFooter } from "@/components/search/SiteFooter";

const NAV = [
  { href: "/developers", label: "Vue d’ensemble", exact: true as const },
  { href: "/developers/docs", label: "Documentation OAuth", exact: false as const },
  { href: "/developers/console", label: "Console", exact: false as const },
  { href: "/developers/policy", label: "Politique", exact: false as const },
] as const;

type Props = {
  children: React.ReactNode;
  activePath: string;
  kicker?: string;
  title?: string;
  wide?: boolean;
};

export function DevelopersShell({ children, activePath, kicker, title, wide }: Props) {
  return (
    <div
      className={`relative z-10 mx-auto flex min-h-dvh w-full flex-col px-4 pb-16 pt-8 sm:px-6 dev-console-shell ${wide ? "max-w-6xl" : "max-w-5xl"}`}
    >
      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="opacity-90 transition hover:opacity-100" aria-label="Accueil Ayeba">
          <AyebaWordmark size="sm" />
        </Link>
        <nav className="dev-shell-nav" aria-label="Developers">
          {NAV.map((item) => {
            const active = item.exact ? activePath === item.href : activePath.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "active" : undefined}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {(kicker || title) && (
        <div className="mb-6">
          {kicker ? <p className="ayeba-kicker ayeba-kicker-accent">{kicker}</p> : null}
          {title ? <h1 className="mt-2 text-2xl font-semibold text-[var(--ink)]">{title}</h1> : null}
        </div>
      )}

      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
