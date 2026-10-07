import { NextResponse } from "next/server";
import { checkSameOrigin, ipOf, moneyError, requireMoneyUser } from "@/lib/money/http";
import { audit, claimHandle, getOrCreateWallet } from "@/lib/money/core";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** POST /api/money/handle — revendique une adresse @pseudo. */
export async function POST(req: Request) {
  const user = await requireMoneyUser();
  if (user instanceof NextResponse) return user;
  const csrf = checkSameOrigin(req);
  if (csrf) return csrf;
  if (!rateLimit(`money-handle:${user.id}:${clientIp(req)}`, 10, 60_000)) {
    return rateLimitResponse();
  }

  let body: { handle?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  if (!body.handle) {
    return NextResponse.json({ error: "handle requis" }, { status: 400 });
  }

  try {
    const handle = await claimHandle(user.id, body.handle);
    const wallet = await getOrCreateWallet(user.id);
    await audit(user.id, wallet.id, "handle_claim", { handle }, ipOf(req), req.headers.get("user-agent") || "");
    return NextResponse.json({ handle: `@${handle}` });
  } catch (e) {
    return moneyError(e);
  }
}
