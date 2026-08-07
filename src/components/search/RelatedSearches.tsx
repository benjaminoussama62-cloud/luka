"use client";

import { useAyeba } from "@/lib/store";

export function RelatedSearches() {
  const { response, search } = useAyeba();
  const items = response?.related?.filter(Boolean) ?? [];
  if (!items.length) return null;

  return (
    <section className="mt-10 border-t border-[var(--line)] pt-8">
      <p className="ayeba-kicker mb-4">Recherches associées</p>
      <div className="flex flex-wrap gap-2">
        {items.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => search(q)}
            className="ayeba-ghost rounded-full px-4 py-2 text-sm normal-case tracking-normal"
          >
            {q}
          </button>
        ))}
      </div>
    </section>
  );
}
