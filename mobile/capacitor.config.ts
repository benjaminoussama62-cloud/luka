import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Ayeba Money — coquille native iOS/Android (Capacitor).
 *
 * L'app n'embarque AUCUN code client : elle charge ayeba.app/money en live.
 * → Un seul codebase (le site), mises à jour instantanées sans store,
 *   poids minimal (~10 Mo de shell), sécurité servie côté serveur.
 */
const config: CapacitorConfig = {
  appId: "app.ayeba.money",
  appName: "Ayeba Money",
  webDir: "www",
  server: {
    url: "https://ayeba.app/money",
    cleartext: false,
    androidScheme: "https",
  },
  ios: {
    contentInset: "always",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
