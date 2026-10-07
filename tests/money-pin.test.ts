import { describe, expect, it, vi } from "vitest";

vi.stubEnv("AYEBA_SIGNING_SECRET", "test-money-secret-0123456789abcdef");

describe("PIN money", () => {
  it("format strict : exactement 4 chiffres", async () => {
    const { isValidPinFormat } = await import("@/lib/money/pin");
    expect(isValidPinFormat("1234")).toBe(true);
    expect(isValidPinFormat("0000")).toBe(true);
    expect(isValidPinFormat("123")).toBe(false);
    expect(isValidPinFormat("12345")).toBe(false);
    expect(isValidPinFormat("abcd")).toBe(false);
    expect(isValidPinFormat("12 34")).toBe(false);
    expect(isValidPinFormat(1234)).toBe(false);
    expect(isValidPinFormat("")).toBe(false);
  });

  it("hash + vérif : le hash stocké n'est pas le PIN", async () => {
    const { checkPin, hashPin } = await import("@/lib/money/pin");
    const hash = await hashPin("user-1", "4582");
    expect(hash).not.toContain("4582");
    expect(await checkPin("user-1", "4582", hash)).toBe(true);
    expect(await checkPin("user-1", "4583", hash)).toBe(false);
    // Le PIN est lié à l'utilisateur : un hash volé ne sert pas à un autre user.
    expect(await checkPin("user-2", "4582", hash)).toBe(false);
  });

  it("deux PIN identiques → hashs différents (salt bcrypt)", async () => {
    const { hashPin } = await import("@/lib/money/pin");
    const a = await hashPin("user-1", "1111");
    const b = await hashPin("user-1", "1111");
    expect(a).not.toBe(b);
  });

  it("verrouillage progressif après échecs répétés", async () => {
    const { PIN_MAX_FREE_ATTEMPTS, pinFailureUpdate, pinLockState } = await import(
      "@/lib/money/pin"
    );
    let w = { pin_attempts: 0, pin_lock_level: 0, pin_locked_until: null as string | null };
    expect(pinLockState(w).locked).toBe(false);

    for (let i = 0; i < PIN_MAX_FREE_ATTEMPTS - 1; i++) {
      const upd = pinFailureUpdate(w);
      w = { ...w, ...upd };
      expect(w.pin_locked_until).toBeNull();
    }
    // L'échec qui atteint le seuil verrouille.
    const upd = pinFailureUpdate(w);
    w = { ...w, ...upd };
    expect(w.pin_locked_until).toBeTruthy();
    expect(pinLockState(w).locked).toBe(true);
    if (pinLockState(w).locked) {
      expect((pinLockState(w) as { retryAfterSec: number }).retryAfterSec).toBeGreaterThan(0);
    }
    // Palier suivant : attente plus longue.
    const upd2 = pinFailureUpdate({ ...w, pin_attempts: PIN_MAX_FREE_ATTEMPTS - 1 });
    const t1 = new Date(w.pin_locked_until!).getTime();
    const t2 = new Date(upd2.pin_locked_until!).getTime();
    expect(t2 - Date.now()).toBeGreaterThan(t1 - Date.now());
  });
});
