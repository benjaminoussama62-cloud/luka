import Link from "next/link";
import { notFound } from "next/navigation";
import { AyebiStage } from "@/components/ayebi/AyebiStage";
import { getUserPublicProfile, getUserContributions } from "@/lib/ayebi/db-sqlite";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = getUserPublicProfile(id);
  return { title: profile ? `${profile.name} — Contributeur Ayebi` : "Utilisateur — Ayebi" };
}

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = getUserPublicProfile(id);
  if (!profile) notFound();
  const contributions = getUserContributions(id, 30);

  const roleLabel: Record<string, string> = {
    admin: "Administrateur",
    moderator: "Modérateur",
    contributor: "Contributeur",
    reader: "Lecteur",
  };

  return (
    <>
      <AyebiStage />
      <div className="relative z-10 px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <Link href="/ayebi" className="ayeba-ghost px-3 py-1.5 text-xs">← Ayebi</Link>

          <div className="ayeba-panel mt-6 p-6">
            <div className="flex flex-wrap items-center gap-4">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white"
                style={{ backgroundColor: profile.avatarColor }}
              >
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="font-[family-name:var(--font-display)] text-3xl text-white">{profile.name}</h1>
                <p className="mt-1 text-sm text-[var(--muted)]">{roleLabel[profile.role] ?? profile.role}</p>
                <p className="mt-1 font-mono text-[10px] text-[var(--faint)]">
                  Membre depuis {new Date(profile.createdAt).toLocaleDateString("fr-FR", { year: "numeric", month: "long" })}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="ayeba-panel p-4 text-center">
                <p className="font-[family-name:var(--font-display)] text-2xl text-white">{profile.editCount}</p>
                <p className="text-xs text-[var(--faint)]">modifications</p>
              </div>
              <div className="ayeba-panel p-4 text-center">
                <p className="font-[family-name:var(--font-display)] text-2xl text-white">{profile.articleCount}</p>
                <p className="text-xs text-[var(--faint)]">fiches créées</p>
              </div>
            </div>
          </div>

          {contributions.length > 0 && (
            <section className="mt-10">
              <h2 className="ayeba-kicker mb-4">Contributions récentes</h2>
              <ul className="ayeba-panel divide-y divide-[var(--line)]">
                {contributions.map((c) => (
                  <li key={`${c.slug}-${c.revision}`} className="px-5 py-3">
                    <Link href={`/ayebi/${c.slug}`} className="font-medium text-white hover:underline">
                      {c.title || c.slug}
                    </Link>
                    <span className="ml-2 text-sm text-[var(--muted)]">— {c.editSummary}</span>
                    <p className="mt-1 font-mono text-[10px] text-[var(--faint)]">
                      rev. {c.revision} · {new Date(c.createdAt).toLocaleString("fr-FR")}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
