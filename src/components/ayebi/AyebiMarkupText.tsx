"use client";

import { renderAyebiMarkup } from "@/lib/ayebi/wiki-markup";

export function AyebiMarkupText({ text, className }: { text: string; className?: string }) {
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: renderAyebiMarkup(text) }}
    />
  );
}
