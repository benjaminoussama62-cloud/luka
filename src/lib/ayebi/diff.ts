import { diffLines } from "diff";
import { textOfArticle, type RevisionRow } from "./db-sqlite";
import type { AyebiArticle } from "./types";

export type DiffLine = { type: "add" | "remove" | "same"; text: string };

export function diffArticles(a: AyebiArticle, b: AyebiArticle): DiffLine[] {
  const left = textOfArticle(a).split("\n");
  const right = textOfArticle(b).split("\n");
  const parts = diffLines(left.join("\n"), right.join("\n"));
  const out: DiffLine[] = [];
  for (const p of parts) {
    const lines = p.value.split("\n").filter((l, i, arr) => i < arr.length - 1 || l.length > 0);
    for (const line of lines) {
      if (p.added) out.push({ type: "add", text: line });
      else if (p.removed) out.push({ type: "remove", text: line });
      else out.push({ type: "same", text: line });
    }
  }
  return out;
}

export function diffRevisions(prev: RevisionRow | null, next: RevisionRow): DiffLine[] {
  if (!prev) return diffArticles({ slug: next.slug } as AyebiArticle, next.article);
  return diffArticles(prev.article, next.article);
}
