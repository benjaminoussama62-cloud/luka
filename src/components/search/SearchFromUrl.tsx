"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAyeba } from "@/lib/store";

/** Lance une recherche quand l'URL contient ?q= (barre d'adresse, OpenSearch, favoris). */
export function SearchFromUrl() {
  const params = useSearchParams();
  const { search } = useAyeba();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    const q = params.get("q")?.trim();
    if (!q || handled.current === q) return;
    handled.current = q;
    search(q);
  }, [params, search]);

  return null;
}
