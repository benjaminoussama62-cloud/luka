"use client";

import type { SearchResult } from "@/lib/types";
import { ConflictBadge } from "./TrustBadges";

const TYPE_LABEL: Record<SearchResult["sourceType"], string> = {
  web: "Web",
  news: "News",
  academic: "Science",
  gov: "Officiel",
  blog: "Blog",
  wiki: "Wiki",
  tech: "Tech",
  local: "Local",
  shop: "Shop",
};

export function ResultCard({ result, dense = false }: { result: SearchResult; dense?: boolean }) {
  return (
    <article className={`ayeba-result group animate-rise ${dense ? "!py-5" : ""}`}>
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--faint)]">
        <span className="inline-flex items-center gap-1.5 text-[var(--muted)]">
          {result.favicon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={result.favicon} alt="" width={14} height={14} className="rounded-sm opacity-80" />
          ) : null}
          {result.domain}
        </span>
        <span aria-hidden>·</span>
        <span>{TYPE_LABEL[result.sourceType]}</span>
        {result.congoRelevant ? (
          <>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1 text-[var(--orange)]">
              <span className="local-dot" aria-hidden />
              local
            </span>
          </>
        ) : null}
        {result.trust.credibility >= 80 ? (
          <>
            <span aria-hidden>·</span>
            <span className="tabular-nums text-[var(--good)]">{result.trust.credibility}</span>
          </>
        ) : null}
      </div>

      <a
        href={result.url}
        target="_blank"
        rel="noreferrer"
        className="font-[family-name:var(--font-display)] text-[20px] font-medium leading-[1.32] tracking-[-0.03em] text-[var(--ink)] transition-colors duration-300 group-hover:text-[var(--orange)] sm:text-[22px]"
      >
        {result.title}
      </a>

      <p className="mt-2 max-w-2xl text-[15px] leading-[1.72] text-[var(--muted)]">{result.snippet}</p>

      {result.sitelinks && result.sitelinks.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {result.sitelinks.map((s) => (
            <a
              key={s.url + s.title}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="text-[13px] text-[var(--link)] transition-opacity duration-300 hover:opacity-70"
            >
              {s.title}
            </a>
          ))}
        </div>
      )}

      <div className="mt-3 max-w-[200px] opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="ayeba-meter">
          <span style={{ width: `${result.trust.credibility}%` }} />
        </div>
      </div>

      <ConflictBadge conflict={result.conflict} />
    </article>
  );
}
