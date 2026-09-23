import { describe, expect, it } from "vitest";
import { getDb } from "@/lib/storage/database";
import {
  addMemberByEmail,
  createApiKey,
  createProject,
  deleteProject,
  getLogsForProject,
  getUsageForProject,
  listAccessibleProjects,
  listEnabledApis,
  listMembers,
  listProjectApiKeys,
  projectAccess,
  removeMember,
  setApiEnabled,
  updateProjectName,
  validateApiKey,
} from "@/lib/developers/console";

const S = Date.now().toString(36);
const OWNER = `dev-owner-${S}`;
const OTHER = `dev-other-${S}`;

function seedUser(id: string, email: string) {
  const db = getDb();
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  db.prepare("INSERT INTO users (id, name, email, created_at) VALUES (?, ?, ?, ?)").run(
    id,
    email.split("@")[0],
    email,
    new Date().toISOString(),
  );
}

function req() {
  return new Request("https://ayeba.app/api/v1/search?q=x", {
    headers: { "x-forwarded-for": "10.0.0.1" },
  });
}

describe("developer projects — accès, membres, APIs", () => {
  it("owner a le rôle owner, un étranger n'a aucun accès", () => {
    const p = createProject(OWNER, "Projet A");
    expect(projectAccess(p.id, OWNER)).toBe("owner");
    expect(projectAccess(p.id, OTHER)).toBeNull();
  });

  it("renomme le projet uniquement pour le propriétaire", () => {
    const p = createProject(OWNER, "Avant");
    expect(updateProjectName(p.id, OTHER, "Hack")).toBe(false);
    expect(updateProjectName(p.id, OWNER, "Après")).toBe(true);
    expect(updateProjectName(p.id, OWNER, "   ")).toBe(false);
  });

  it("ajoute un membre par email, avec rôle appliqué côté serveur", () => {
    seedUser(OTHER, `${OTHER}@users.test`);
    const p = createProject(OWNER, "Equipe");

    const res = addMemberByEmail(p.id, OWNER, `${OTHER}@users.test`, "editor");
    expect("ok" in res && res.ok).toBe(true);
    expect(projectAccess(p.id, OTHER)).toBe("editor");

    const members = listMembers(p.id);
    expect(members).toHaveLength(1);
    expect(members[0].role).toBe("editor");

    // un membre ne peut pas gérer les membres
    const denied = addMemberByEmail(p.id, OTHER, "x@users.test", "viewer");
    expect("error" in denied).toBe(true);

    // retrait
    expect(removeMember(p.id, OWNER, OTHER)).toBe(true);
    expect(projectAccess(p.id, OTHER)).toBeNull();
  });

  it("refuse un email sans compte Ayeba", () => {
    const p = createProject(OWNER, "Solo");
    const res = addMemberByEmail(p.id, OWNER, "inexistant@nul.test", "viewer");
    expect("error" in res).toBe(true);
  });

  it("un éditeur peut créer des clés, un lecteur non", () => {
    seedUser(OTHER, `${OTHER}@users.test`);
    const p = createProject(OWNER, "Delegue");
    addMemberByEmail(p.id, OWNER, `${OTHER}@users.test`, "editor");
    expect(createApiKey(OTHER, p.id, { name: "k-editor" })).not.toBeNull();

    const viewer = `dev-viewer-${S}`;
    seedUser(viewer, `${viewer}@users.test`);
    addMemberByEmail(p.id, OWNER, `${viewer}@users.test`, "viewer");
    expect(createApiKey(viewer, p.id, { name: "k-viewer" })).toBeNull();
  });

  it("listAccessibleProjects inclut les projets partagés", () => {
    seedUser(OTHER, `${OTHER}@users.test`);
    const p = createProject(OWNER, "Partage");
    addMemberByEmail(p.id, OWNER, `${OTHER}@users.test`, "viewer");
    const { owned, member } = listAccessibleProjects(OTHER);
    expect(owned.find((x) => x.id === p.id)).toBeUndefined();
    const shared = member.find((x) => x.id === p.id);
    expect(shared?.memberRole).toBe("viewer");
  });

  it("active/désactive les APIs du catalogue par projet", () => {
    const p = createProject(OWNER, "Catalogue");
    expect(listEnabledApis(p.id)).toEqual([]);
    setApiEnabled(p.id, "search", true, OWNER);
    setApiEnabled(p.id, "suggest", true, OWNER);
    expect(listEnabledApis(p.id).sort()).toEqual(["search", "suggest"]);
    setApiEnabled(p.id, "suggest", false, OWNER);
    expect(listEnabledApis(p.id)).toEqual(["search"]);
  });

  it("la portée suggest est exigée pour l'endpoint suggest", () => {
    const p = createProject(OWNER, "Scopes");
    const { secret } = createApiKey(OWNER, p.id, {
      name: "search-only",
      scopes: ["search"],
    })!;
    const denied = validateApiKey(secret, "suggest", req(), "suggest");
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.status).toBe(403);

    const { secret: s2 } = createApiKey(OWNER, p.id, {
      name: "both",
      scopes: ["search", "suggest"],
    })!;
    expect(validateApiKey(s2, "suggest", req(), "suggest").ok).toBe(true);
  });

  it("usage et journaux par projet sont isolés", () => {
    const a = createProject(OWNER, "P-A");
    const b = createProject(OWNER, "P-B");
    const { secret } = createApiKey(OWNER, a.id, { name: "k" })!;
    validateApiKey(secret, "search", req(), "search"); // logue un 200? non — uniquement 4xx/…
    // validateApiKey ne journalise pas les succès; insérer un appel réel :
    getDb()
      .prepare(
        "INSERT INTO developer_api_logs (key_id, project_id, endpoint, status_code, latency_ms, ip, created_at) VALUES (?, ?, 'search', 200, 42, '1.1.1.1', ?)",
      )
      .run("console", a.id, new Date().toISOString());

    const ua = getUsageForProject(a.id, 30);
    const ub = getUsageForProject(b.id, 30);
    expect(ua.totals.calls).toBeGreaterThanOrEqual(1);
    expect(ub.totals.calls).toBe(0);
    expect(getLogsForProject(b.id).length).toBe(0);
  });

  it("listProjectApiKeys retourne les clés du projet sans secret", () => {
    const p = createProject(OWNER, "Keys");
    createApiKey(OWNER, p.id, { name: "k1" });
    const keys = listProjectApiKeys(p.id);
    expect(keys.length).toBe(1);
    expect(keys[0].prefix).toMatch(/^ayb_live_/);
    expect(JSON.stringify(keys[0])).not.toContain("key_hash");
  });

  it("suppression de projet révoque les clés", () => {
    const p = createProject(OWNER, "Delete");
    const { key } = createApiKey(OWNER, p.id, { name: "doomed" })!;
    expect(deleteProject(p.id, OWNER)).toBe(true);
    const k = listProjectApiKeys(p.id)[0];
    expect(k?.status).toBe("revoked");
    expect(key.id).toBeTruthy();
  });
});
