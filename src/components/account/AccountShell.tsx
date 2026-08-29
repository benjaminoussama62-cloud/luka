import Link from "next/link";
import { GradientStage } from "@/components/effects/GradientStage";
import { AyebaWordmark } from "@/components/brand/AyebaIcon";
import { SiteFooter } from "@/components/search/SiteFooter";

const NAV = [
  { href: "/compte", label: "Vue d'ensemble", exact: true as const },
  { href: "/compte/applications", label: "Applications connectées", exact: false as const },
  { href: "/compte/securite", label: "Sécurité", exact: false as const },
] as const;

type Props = {
  children: React.ReactNode;
  activePath: string;
  title?: string;
};

export function AccountShell({ children, activePath, title }: Props) {
  return (
    <>
      <GradientStage />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-4 pb-16 pt-8 sm:px-6 account-shell">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="opacity-90 transition hover:opacity-100" aria-label="Accueil Ayeba">
            <AyebaWordmark size="sm" />
          </Link>
          <nav className="dev-shell-nav" aria-label="Compte">
            {NAV.map((item) => {
              const active = item.exact ? activePath === item.href : activePath.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} className={active ? "active" : undefined}>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        {title ? (
          <div className="mb-6">
            <p className="ayeba-kicker ayeba-kicker-accent">Compte Ayeba</p>
            <h1 className="mt-2 text-2xl font-semibold text-[var(--ink)]">{title}</h1>
          </div>
        ) : null}
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </>
  );
}
