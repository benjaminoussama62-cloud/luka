import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { normalizeOmni, buildSearchUrl, isEngine } = require(
  "../desktop/ayeba-browser/src/search-engines.js",
);

describe("AYEBA browser — normalizeOmni", () => {
  it("renvoie null pour une saisie vide", () => {
    expect(normalizeOmni("")).toBeNull();
    expect(normalizeOmni("   ")).toBeNull();
  });

  it("laisse passer les URLs http(s) et file", () => {
    expect(normalizeOmni("https://exemple.com/a")).toBe("https://exemple.com/a");
    expect(normalizeOmni("http://exemple.com")).toBe("http://exemple.com");
    expect(normalizeOmni("file:///C:/docs/index.html")).toBe("file:///C:/docs/index.html");
  });

  it("les schémas inconnus partent en recherche (pas de loadURL en échec)", () => {
    const out = normalizeOmni("ayeba://parametres", "ayeba");
    expect(out).toBe(buildSearchUrl("ayeba://parametres", "ayeba"));
    expect(out).toContain("ayeba.app/?q=");
  });

  it("localhost et hôtes locaux naviguent, jamais en recherche", () => {
    expect(normalizeOmni("localhost")).toBe("http://localhost");
    expect(normalizeOmni("localhost:3000")).toBe("http://localhost:3000");
    expect(normalizeOmni("localhost:8080/api")).toBe("http://localhost:8080/api");
    expect(normalizeOmni("127.0.0.1:8080/x")).toBe("http://127.0.0.1:8080/x");
    expect(normalizeOmni("::1")).toBe("http://[::1]");
    expect(normalizeOmni("[::1]:3000")).toBe("http://[::1]:3000");
  });

  it("du texte libre part en recherche", () => {
    expect(normalizeOmni("kinshasa", "ayeba")).toBe("https://ayeba.app/?q=kinshasa");
    expect(normalizeOmni("république démocratique du congo", "google")).toBe(
      "https://www.google.com/search?q=r%C3%A9publique%20d%C3%A9mocratique%20du%20congo",
    );
  });

  it("un domaine sans schéma reçoit https://", () => {
    expect(normalizeOmni("example.com")).toBe("https://example.com");
    expect(normalizeOmni("docs.example.com/path")).toBe("https://docs.example.com/path");
  });

  it("javascript:/data: ne peuvent pas être injectés comme URLs", () => {
    const js = normalizeOmni("javascript:alert(1)", "ayeba");
    expect(js).toContain("ayeba.app/?q=");
    const data = normalizeOmni("data:text/html,<h1>x</h1>", "ayeba");
    expect(data).not.toMatch(/^data:/);
  });

  it("isEngine valide les moteurs connus", () => {
    expect(isEngine("ayeba")).toBe(true);
    expect(isEngine("google")).toBe(true);
    expect(isEngine("yandex")).toBe(true);
    expect(isEngine("bing")).toBe(false);
  });
});
