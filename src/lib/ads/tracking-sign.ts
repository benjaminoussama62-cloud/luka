/** Signed ad-tracking tokens — shared by the ad server and the beacon route. */
import { hmacSha256, safeEqual, signingSecret } from "@/lib/security/sign";

export type AdTrackType = "impression" | "click" | "viewthrough";

export function adTrackingSignature(
  type: AdTrackType | string,
  requestId: string,
  creativeId: string,
): string {
  try {
    return hmacSha256(signingSecret(), `ad:${type}:${requestId}:${creativeId}`).slice(0, 24);
  } catch {
    return "";
  }
}

export function verifyAdTrackingSignature(
  type: string,
  requestId: string,
  creativeId: string,
  signature: string,
): boolean {
  if (!signature) return false;
  return safeEqual(signature, adTrackingSignature(type, requestId, creativeId));
}
