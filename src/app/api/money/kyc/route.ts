import { NextResponse } from "next/server";
import { checkSameOrigin, moneyError, requireMoneyUser } from "@/lib/money/http";
import { getKyc, submitKyc } from "@/lib/money/features";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireMoneyUser();
  if (user instanceof NextResponse) return user;
  const k = await getKyc(user.id);
  return NextResponse.json({ kyc: k ?? null });
}

export async function POST(req: Request) {
  const user = await requireMoneyUser();
  if (user instanceof NextResponse) return user;
  const csrf = checkSameOrigin(req);
  if (csrf) return csrf;

  let body: { fullName?: string; birthdate?: string; idType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const fullName = String(body.fullName || "").trim();
  const birthdate = String(body.birthdate || "").trim();
  const idType = String(body.idType || "").trim();
  if (fullName.length < 3 || !/^\d{4}-\d{2}-\d{2}$/.test(birthdate) || !idType) {
    return NextResponse.json({ error: "Nom complet, date (AAAA-MM-JJ) et type de pièce requis" }, { status: 400 });
  }
  try {
    const r = await submitKyc({ userId: user.id, fullName, birthdate, idType });
    return NextResponse.json(r);
  } catch (e) {
    return moneyError(e);
  }
}
