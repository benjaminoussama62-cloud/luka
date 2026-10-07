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
  return NextResponse.json(statements, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
