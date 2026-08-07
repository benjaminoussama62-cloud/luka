import type { AyebiCategory } from "./types";

export const AYEBI_CATEGORIES: { id: AyebiCategory; label: string }[] = [
  { id: "personnalité", label: "Personnalité" },
  { id: "lieu", label: "Lieu & monument" },
  { id: "institution", label: "Institution" },
  { id: "culture", label: "Culture & arts" },
  { id: "sport", label: "Sport" },
  { id: "économie", label: "Économie & mines" },
];

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
