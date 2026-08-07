import type { AyebiRole } from "./db-sqlite";

export function roleFromUser(user: { role?: string } | null): AyebiRole {
  const r = user?.role as AyebiRole | undefined;
  if (r === "admin" || r === "moderator" || r === "contributor" || r === "reader") return r;
  return "contributor";
}

export function canEdit(role: AyebiRole): boolean {
  return role === "contributor" || role === "moderator" || role === "admin";
}

export function canModerate(role: AyebiRole): boolean {
  return role === "moderator" || role === "admin";
}

export function canAdmin(role: AyebiRole): boolean {
  return role === "admin";
}
