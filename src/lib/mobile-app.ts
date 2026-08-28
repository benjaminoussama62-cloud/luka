/** Detect AYEBA native / installed app shell (Capacitor, PWA standalone, ?app=1). */
export function isMobileApp(): boolean {
  if (typeof window === "undefined") return false;

  if (sessionStorage.getItem("ayeba-app") === "1") return true;

  const params = new URLSearchParams(window.location.search);
  if (params.get("app") === "1") return true;

  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (cap?.isNativePlatform?.()) return true;

  return (
    window.matchMedia("(display-mode: standalone)").matches &&
    /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)
  );
}

export function markMobileAppSession(): void {
  try {
    sessionStorage.setItem("ayeba-app", "1");
  } catch {
    /* private mode */
  }
}
