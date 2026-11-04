import { NextResponse } from "next/server";
import { checkSameOrigin, idemKeyOf, ipOf, moneyError, requireMoneyUser } from "@/lib/money/http";
import { resolveRequest } from "@/lib/money/features";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** POST /api/money/requests/[id] — {action:"pay"|"decline"|"cancel", pin?} */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireMoneyUser();
  if (user instanceof NextResponse) return user;
  const csrf = checkSameOrigin(req);
  if (csrf) return csrf;
  if (!(await rateLimit(`money-reqact:${user.id}:${clientIp(req)}`, 15, 60_000))) {
    return rateLimitResponse();
  }

  const { id } = await ctx.params;
  let body: { action?: string; pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  if (!["pay", "decline", "cancel"].includes(String(body.action))) {
    return NextResponse.json({ error: "action (pay|decline|cancel) requise" }, { status: 400 });
  }
  try {
    const r = await resolveRequest({
      userId: user.id,
      requestId: id,
      action: body.action as "pay" | "decline" | "cancel",
      pin: body.pin,
      idemKey: idemKeyOf(req, body as Record<string, unknown>) || `req-${id}-${body.action}`,
      ip: ipOf(req),
      userAgent: req.headers.get("user-agent") || "",
    });
    return NextResponse.json(r);
  } catch (e) {
    return moneyError(e);
  }
}
