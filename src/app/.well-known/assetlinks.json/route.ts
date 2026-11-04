import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /.well-known/assetlinks.json — Digital Asset Links pour la TWA Android.
 *
 * Servi UNIQUEMENT si ANDROID_PACKAGE_NAME + ANDROID_SHA256_FINGERPRINT sont
 * configurés (fingerprint du keystore de signature réel — jamais inventé).
 * Sinon [] : le lien TWA n'est pas revendiqué, aucune app ne peut l'usurper.
 */
// Fingerprint SHA-256 du keystore de signature Mbongo (mobile/android-twa).
// C'est une clé publique de vérification — pas un secret.
const MBONGO_STATEMENT = {
  relation: ["delegate_permission/common.handle_all_urls"],
  target: {
    namespace: "android_app",
    package_name: "app.ayeba.mbongo",
    sha256_cert_fingerprints: [
      "82:FF:A8:58:EC:CC:83:9D:48:01:26:58:FC:6F:21:3B:4D:1C:C0:C5:8A:7D:03:4F:26:48:6A:01:07:F1:7F:63",
    ],
  },
};

export async function GET() {
  const pkg = process.env.ANDROID_PACKAGE_NAME?.trim();
  const fingerprint = process.env.ANDROID_SHA256_FINGERPRINT?.trim();
  const statements =
    pkg && fingerprint
      ? [
          {
            relation: ["delegate_permission/common.handle_all_urls"],
            target: {
              namespace: "android_app",
              package_name: pkg,
              sha256_cert_fingerprints: [fingerprint],
            },
          },
        ]
      : [];
  statements.push(MBONGO_STATEMENT);
  return NextResponse.json(statements, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
