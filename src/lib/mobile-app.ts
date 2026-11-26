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

/**
 * Props for external anchors. On the web, open a real new tab (like Google).
 * Inside the native app WebView, _blank is unsupported — navigate same-tab
 * instead (Safari-style; the native back button returns to Ayeba).
 */
export function externalLinkProps(): { target?: string; rel?: string } {
  if (typeof window !== "undefined" && isMobileApp()) return {};
  return { target: "_blank", rel: "noopener noreferrer" };
}

/**
 * Ouvre une URL externe sans quitter l'app :
 * - iOS natif : SFSafariViewController modal (recommande par Apple)
 * - web : nouvel onglet classique
 */
export function openExternal(url: string): void {
  if (typeof window === "undefined") return;
  const cap = (window as Window & {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      Plugins?: { AyebaBrowser?: { openSafariView?(o: { url: string }): Promise<void> } };
    };
  }).Capacitor;
  if (cap?.isNativePlatform?.() && cap.Plugins?.AyebaBrowser?.openSafariView) {
    void cap.Plugins.AyebaBrowser.openSafariView({ url });
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Telecharge un fichier genere en JS :
 * - iOS natif : feuille de partage "Enregistrer dans Fichiers"
 *   (a.download est inerte dans WKWebView)
 * - web : telechargement classique
 */
export async function downloadGeneratedFile(name: string, blob: Blob): Promise<void> {
  const cap = (window as Window & {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      Plugins?: {
        AyebaBrowser?: { shareFile?(o: { name: string; data: string; mime?: string }): Promise<void> };
      };
    };
  }).Capacitor;

  if (cap?.isNativePlatform?.() && cap.Plugins?.AyebaBrowser?.shareFile) {
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i += 0x8000) {
      bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    }
    await cap.Plugins.AyebaBrowser.shareFile({ name, data: btoa(bin), mime: blob.type });
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
