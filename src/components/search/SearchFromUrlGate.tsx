import { Suspense } from "react";
import { SearchFromUrl } from "@/components/search/SearchFromUrl";

export function SearchFromUrlGate() {
  return (
    <Suspense fallback={null}>
      <SearchFromUrl />
    </Suspense>
  );
}
