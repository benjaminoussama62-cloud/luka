"use client";

import type { CommunityPost } from "@/lib/types";

const PLATFORM_LABEL: Record<CommunityPost["platform"], string> = {
  reddit: "Reddit",
  discord: "Discord",
  forum: "Forum",
  x: "X",
  tiktok: "TikTok",
  youtube: "YouTube",
};

const PLATFORM_TONE: Record<CommunityPost["platform"], string> = {
  reddit: "from-orange-500/20 to-transparent",
  discord: "from-indigo-500/20 to-transparent",
  forum: "from-zinc-500/20 to-transparent",
  x: "from-white/15 to-transparent",
  tiktok: "from-cyan-400/20 to-transparent",
  youtube: "from-red-500/25 to-transparent",
};

export function CommunityIndex({ posts }: { posts: CommunityPost[] }) {
  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white">
          Index communautaire
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Forums, X, YouTube, Reddit — signal social filtré, pas un fil toxique brut.
        </p>
      </div>
      {posts.map((post, i) => (
        <article
          key={post.id}
          className={`ayeba-panel relative overflow-hidden p-5 animate-rise bg-gradient-to-br ${PLATFORM_TONE[post.platform]}`}
          style={{ animationDelay: `${i * 0.06}s` }}
        >
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-[rgba(255,45,63,0.18)] px-2.5 py-1 font-medium text-[var(--red)]">
              {PLATFORM_LABEL[post.platform]}
            </span>
            <span className="text-[var(--faint)]">@{post.author}</span>
            <span className="text-[var(--faint)]">{post.postedAt}</span>
            <span className="ml-auto tabular-nums text-[var(--good)]">confiance {post.trustScore}</span>
          </div>
          <a
            href={post.url}
            target="_blank"
            rel="noreferrer"
            className="font-[family-name:var(--font-display)] text-lg font-semibold text-white hover:text-[var(--red)]"
          >
            {post.title}
          </a>
          <p className="mt-2.5 text-sm leading-relaxed text-[var(--muted)]">{post.excerpt}</p>
          <div className="mt-4 ayeba-meter max-w-[180px]">
            <span style={{ width: `${post.trustScore}%` }} />
          </div>
        </article>
      ))}
    </div>
  );
}
