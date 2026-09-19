"use client";

import { renderAyebiMarkup } from "@/lib/ayebi/wiki-markup";
import type { AyebiReference } from "@/lib/ayebi/types";

export function AyebiMarkupText({
  text,
  className,
  refs,
}: {
  text: string;
  className?: string;
  refs?: AyebiReference[];
}) {
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: renderAyebiMarkup(text, refs) }}
    />
  );
}
