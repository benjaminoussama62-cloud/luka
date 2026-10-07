import { describe, expect, it } from "vitest";
import {
  isMoneyCurrency,
  minorToMajor,
  minorToMajorString,
  parseAmountToMinor,
} from "@/lib/money/amounts";

describe("parseAmountToMinor — jamais de flottant, jamais de montant exotique", () => {
  it("convertit correctement en unités mineures", () => {
    expect(parseAmountToMinor("25", "USD")).toBe(2500);
    expect(parseAmountToMinor("25.50", "USD")).toBe(2550);
    expect(parseAmountToMinor("0.01", "USD")).toBe(1);
    expect(parseAmountToMinor("5000", "CDF")).toBe(500_000);
    expect(parseAmountToMinor("5000.99", "CDF")).toBe(500_099);
  });

  it("rejette les montants invalides ou dangereux", () => {
    expect(parseAmountToMinor("", "USD")).toBeNull();
    expect(parseAmountToMinor("abc", "USD")).toBeNull();
    expect(parseAmountToMinor("-5", "USD")).toBeNull();
    expect(parseAmountToMinor("0", "USD")).toBeNull();
    expect(parseAmountToMinor("0.001", "USD")).toBeNull(); // 3 décimales
    expect(parseAmountToMinor("1e5", "USD")).toBeNull();
    expect(parseAmountToMinor("25,50", "USD")).toBeNull(); // virgule
    expect(parseAmountToMinor("25 ", "USD")).toBe(2500); // trim OK
    expect(parseAmountToMinor(" 25 ", "USD")).toBe(2500);
    expect(parseAmountToMinor("99999999999", "USD")).toBeNull(); // > plafond
    expect(parseAmountToMinor(null, "USD")).toBeNull();
    expect(parseAmountToMinor(25.5, "USD")).toBe(2550); // number sérialisé
  });

  it("isMoneyCurrency n'accepte que USD/CDF", () => {
    expect(isMoneyCurrency("USD")).toBe(true);
    expect(isMoneyCurrency("CDF")).toBe(true);
    expect(isMoneyCurrency("EUR")).toBe(false);
    expect(isMoneyCurrency("usd")).toBe(false);
    expect(isMoneyCurrency("")).toBe(false);
  });
});

describe("minorToMajorString — affichage exact", () => {
  it("formate toujours 2 décimales", () => {
    expect(minorToMajorString(2550, "USD")).toBe("25.50");
    expect(minorToMajorString(2500, "USD")).toBe("25.00");
    expect(minorToMajorString(1, "USD")).toBe("0.01");
    expect(minorToMajorString(0, "USD")).toBe("0.00");
    expect(minorToMajorString(500_000, "CDF")).toBe("5000.00");
    expect(minorToMajorString(-2550, "USD")).toBe("-25.50");
  });

  it("minorToMajor pour les appels provider", () => {
    expect(minorToMajor(2550, "USD")).toBe(25.5);
    expect(minorToMajor(500_000, "CDF")).toBe(5000);
  });
});
