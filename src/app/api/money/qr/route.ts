import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { requireMoneyUser } from "@/lib/money/http";
import { getOrCreateWallet } from "@/lib/money/core";

export const runtime = "nodejs";

/** GET /api/money/qr — PNG du code QR de réception (lien universel /mbongo?to=). */
export async function GET(req: Request) {
  const user = await requireMoneyUser();
  if (user instanceof NextResponse) return user;
  const wallet = await getOrCreateWallet(user.id);
  const identifier = wallet.handle ?? user.email;
  const origin = new URL(req.url).origin;
  const payload = `${origin}/mbongo?to=${encodeURIComponent(identifier)}`;
  const png = await QRCode.toBuffer(payload, { width: 480, margin: 2, errorCorrectionLevel: "M" });
  return new NextResponse(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=300" },
  });
}
