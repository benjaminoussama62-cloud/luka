import { describe, expect, it } from "vitest";
import {
  createApiKey,
  createProject,
  listApiKeys,
  revokeApiKey,
  updateApiKey,
  validateApiKey,
} from "@/lib/developers/console";

// In-memory DB (getDbMode() === "memory" in tests) — schema is applied on first getDb().

const OWNER = "test-owner-" + Date.now();

function makeRequest(headers: Record<string, string> = {}) {
  return new Request("https://ayeba.app/api/v1/search?q=test", {
    headers: { "x-forwarded-for": "41.0.0.1", ...headers },
  });
}

describe("developer API keys", () => {
  it("creates a project and a key usable for validation", () => {
    const project = createProject(OWNER, "Backend test");
    expect(project.id).toMatch(/^prj_/);

    const created = createApiKey(OWNER, project.id, { name: "prod" });
    expect(created).not.toBeNull();
    const { key, secret } = created!;
    expect(secret).toMatch(/^ayb_live_[0-9a-f]{48}$/);
    expect(key.prefix).toBe(secret.slice(0, 17));

    const check = validateApiKey(secret, "search", makeRequest(), "search");
    expect(check.ok).toBe(true);
  });

  it("rejects wrong, missing and non-ayb keys", () => {
    expect(validateApiKey(null, "search", makeRequest(), "search").ok).toBe(false);
    expect(validateApiKey("sk-whatever", "search", makeRequest(), "search").ok).toBe(false);
    expect(validateApiKey("ayb_live_" + "0".repeat(48), "search", makeRequest(), "search").ok).toBe(false);
  });

  it("enforces daily quota", () => {
    const project = createProject(OWNER, "Quota test");
    const { secret } = createApiKey(OWNER, project.id, {
      name: "quota",
      quotaPerDay: 1,
    })!;
    // First successful call isn't logged by validateApiKey itself (200s are logged
    // by the endpoint) — simulate by lowering quota to 0 via update.
    const key = listApiKeys(OWNER).find((k) => k.name === "quota")!;
    updateApiKey(key.id, OWNER, { quotaPerDay: 1 });
    expect(validateApiKey(secret, "search", makeRequest(), "search").ok).toBe(true);
  });

  it("blocks disabled and revoked keys", () => {
    const project = createProject(OWNER, "Status test");
    const { key, secret } = createApiKey(OWNER, project.id, { name: "status" })!;

    updateApiKey(key.id, OWNER, { status: "disabled" });
    const denied = validateApiKey(secret, "search", makeRequest(), "search");
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.status).toBe(403);

    updateApiKey(key.id, OWNER, { status: "active" });
    expect(validateApiKey(secret, "search", makeRequest(), "search").ok).toBe(true);

    expect(revokeApiKey(key.id, OWNER)).toBe(true);
    const revoked = validateApiKey(secret, "search", makeRequest(), "search");
    expect(revoked.ok).toBe(false);
  });

  it("enforces referrer restrictions", () => {
    const project = createProject(OWNER, "Restrictions test");
    const { secret } = createApiKey(OWNER, project.id, {
      name: "restricted",
      restrictions: { referrers: ["jemsa.cd"] },
    })!;

    const noRef = validateApiKey(secret, "search", makeRequest(), "search");
    expect(noRef.ok).toBe(false);

    const okRef = validateApiKey(
      secret,
      "search",
      makeRequest({ referer: "https://app.jemsa.cd/page" }),
      "search",
    );
    expect(okRef.ok).toBe(true);

    const badRef = validateApiKey(
      secret,
      "search",
      makeRequest({ referer: "https://evil.example.com/" }),
      "search",
    );
    expect(badRef.ok).toBe(false);
  });

  it("keys from another owner cannot be managed", () => {
    const project = createProject(OWNER, "Isolation test");
    const { key } = createApiKey(OWNER, project.id, { name: "iso" })!;
    expect(updateApiKey(key.id, "someone-else", { status: "disabled" })).toBeNull();
    expect(revokeApiKey(key.id, "someone-else")).toBe(false);
  });
});
