import Link from "next/link";
import { GradientStage } from "@/components/effects/GradientStage";
import { AyebaWordmark } from "@/components/brand/AyebaIcon";
import { SiteFooter } from "@/components/search/SiteFooter";

type Props = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  updated?: string;
};

export function LegalDocumentShell({ children, title, subtitle, updated }: Props) {
  return (
    <>
      <GradientStage />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pb-16 pt-8 sm:px-6">
        <header className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="opacity-90 transition hover:opacity-100" aria-label="Accueil Ayeba">
            <AyebaWordmark size="sm" />
          </Link>
          <Link href="/legal" className="ayeba-ghost px-3 py-2 text-xs">
            Informations légales
          </Link>
        </header>

        <main className="flex-1">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-3 text-[1.05rem] leading-relaxed text-[var(--muted)]">{subtitle}</p>
          ) : null}
          {updated ? (
            <p className="mt-2 text-xs uppercase tracking-[0.12em] text-[var(--faint)]">{updated}</p>
          ) : null}
          <div className="legal-prose mt-10 space-y-8">{children}</div>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="ayeba-panel p-6 sm:p-7">
      <h2 className="text-lg font-semibold text-[var(--ink)]">{title}</h2>
      <div className="mt-4 space-y-3 text-[0.95rem] leading-[1.7] text-[var(--muted)]">{children}</div>
    </section>
  );
}
