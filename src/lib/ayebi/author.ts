import type { SessionUser } from "../auth-server";
import { getUserRole } from "../users-sqlite";
import type { AyebiRole } from "./db-sqlite";

export type AyebiAuthor = { id: string; name: string; role: AyebiRole };

export async function authorFromSession(session: SessionUser): Promise<AyebiAuthor> {
  return {
    id: session.id,
    name: session.name,
    role: await getUserRole(session.id),
  };
}
