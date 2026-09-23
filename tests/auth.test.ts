import { describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/storage/database";

vi.stubEnv("AUTH_SECRET", "test-secret-32-chars-minimum-00000");

import {
  createSessionToken,
  hashPassword,
  readSessionToken,
  verifyPassword,
} from "@/lib/auth-server";

describe("auth — mots de passe", () => {
  it("hash bcrypt vérifiable, jamais en clair", async () => {
    const hash = await hashPassword("MotDePasse!TresFort42");
    expect(hash).toMatch(/^\$2[aby]\$/);
    expect(hash).not.toContain("MotDePasse");
    expect(await verifyPassword("MotDePasse!TresFort42", hash)).toBe(true);
    expect(await verifyPassword("mauvais", hash)).toBe(false);
  }, 30_000); // bcrypt(12) est volontairement lent
});

describe("auth — jetons de session", () => {
  it("un jeton signé se relit, un jeton falsifié est rejeté", async () => {
    getDb()
      .prepare(
        "INSERT OR REPLACE INTO users (id, name, email, created_at) VALUES (?, ?, ?, ?)",
      )
      .run("u-jwt", "T", "jwt@users.test", new Date().toISOString());

    const user = {
      id: "u-jwt",
      email: "jwt@users.test",
      name: "T",
      role: "contributor",
      avatarColor: "#e85d04",
      createdAt: new Date().toISOString(),
    };
    const token = await createSessionToken(user as never);
    const back = await readSessionToken(token);
    expect(back?.id).toBe("u-jwt");

    const forged = token.slice(0, -4) + (token.endsWith("aaaa") ? "bbbb" : "aaaa");
    expect(await readSessionToken(forged)).toBeNull();
    expect(await readSessionToken("jeton.invalide")).toBeNull();
  });
});
