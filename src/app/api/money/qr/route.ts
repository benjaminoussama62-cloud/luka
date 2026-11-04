import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { requireMoneyUser } from "@/lib/money/http";

export const runtime = "nodejs";

/** GET /api/money/qr — PNG du code QR de réception (handle ou email). */
export async function GET() {
  const user = await requireMoneyUser();
  if (user instanceof NextResponse) return user;
  const payload = `ayeba:pay:${user.email}`;
  const png = await QRCode.toBuffer(payload, { width: 480, margin: 2, errorCorrectionLevel: "M" });
  return new NextResponse(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=300" },
  });
}
