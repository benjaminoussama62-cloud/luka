import Link from "next/link";

export function AyebiStubBanner({ slug }: { slug: string }) {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-[rgba(255,200,0,0.35)] bg-[rgba(255,200,0,0.06)] px-5 py-4">
      <span className="mt-0.5 text-lg">✏️</span>
      <div>
        <p className="text-sm font-medium text-[rgba(255,220,0,0.9)]">Cet article est une ébauche.</p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Vous pouvez contribuer à son développement en{" "}
          <Link href={`/ayebi/${slug}/modifier`} className="text-[var(--accent)] hover:underline">
            le modifiant
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
