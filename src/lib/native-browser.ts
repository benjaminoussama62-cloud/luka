/**
 * Pont JS <-> plugin natif AyebaBrowser (WebView Android reelle).
 * Sur le web classique, window.Capacitor n'existe pas -> fallback iframe.
 * Aucun import @capacitor requis : le runtime natif injecte le global.
 */

export type NativeRect = { x: number; y: number; width: number; height: number };
export type NativeNav = {
  url: string;
  title?: string;
  loading: boolean;
  canGoBack?: boolean;
  canGoForward?: boolean;
  historyList?: string[];
  historyIndex?: number;
};

type ListenerHandle = { remove: () => Promise<void> };

type AyebaBrowserNative = {
  open(opts: NativeRect & { url: string; tabId?: string }): Promise<void>;
  close(): Promise<void>;
  setFrame(rect: NativeRect): Promise<void>;
  setHidden(opts: { hidden: boolean }): Promise<void>;
  loadUrl(opts: { url: string }): Promise<void>;
  goBack(): Promise<void>;
  goForward(): Promise<void>;
  goToIndex(opts: { index: number }): Promise<void>;
  reload(): Promise<void>;
  stop(): Promise<void>;
  evaluate(opts: { script: string }): Promise<{ result?: string }>;
  find(opts: { query: string; forward?: boolean }): Promise<void>;
  clearFind(): Promise<void>;
  setDesktop(opts: { enabled: boolean }): Promise<void>;
  sslProceed(opts: { proceed: boolean }): Promise<void>;
  capture(): Promise<{ data?: string }>;
  saveTab(opts: { id: string }): Promise<void>;
  restoreTab(opts: { id: string; url: string }): Promise<void>;
  removeTab(opts: { id: string }): Promise<void>;
  addListener(event: string, cb: (data: never) => void): Promise<ListenerHandle>;
};

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  Plugins?: Record<string, AyebaBrowserNative>;
};

function plugin(): AyebaBrowserNative | null {
  if (typeof window === "undefined") return null;
  const cap = (window as Window & { Capacitor?: CapacitorGlobal }).Capacitor;
  if (!cap?.isNativePlatform?.()) return null;
  return cap.Plugins?.AyebaBrowser ?? null;
}

export function nativeBrowserAvailable(): boolean {
  return plugin() !== null;
}

export function nativeBrowser(): AyebaBrowserNative | null {
  return plugin();
}

export function addNativeListener<T>(
  event: "nav" | "progress" | "scroll" | "sslError" | "safeBrowsingHit" | "download" | "newTab" | "findResult",
  cb: (data: T) => void,
): (() => void) | null {
  const p = plugin();
  if (!p) return null;
  let disposed = false;
  let handle: ListenerHandle | null = null;
  void p.addListener(event, cb as (data: never) => void).then((h) => {
    if (disposed) void h.remove();
    else handle = h;
  });
  return () => {
    disposed = true;
    void handle?.remove();
  };
}
