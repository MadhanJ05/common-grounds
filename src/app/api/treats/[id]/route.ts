import { NextResponse } from "next/server";
import { readJson, withUser } from "@/lib/api";
import { dismissSuggestion, holdTreat, orderForTreat, respondToTreat } from "@/lib/treats";

type Action =
  | { action: "order" }
  | { action: "hold"; orderId: string }
  | { action: "accept" }
  | { action: "decline" }
  | { action: "dismiss" };

/**
 * One endpoint for the treat card's buttons:
 * - order:   PayPal button's createOrder (returns the AUTHORIZE order Claude prepared, refreshed if stale)
 * - hold:    PayPal button's onApprove (authorizes the order = money held, not charged)
 * - accept / decline: the recipient's answer (decline voids the hold)
 * - dismiss: "not now" on a suggestion
 */
export const POST = withUser<{ params: Promise<{ id: string }> }>(async (req, user, { params }) => {
  const { id } = await params;
  const body = await readJson<Action>(req);
  switch (body.action) {
    case "order":
      return NextResponse.json({ orderId: await orderForTreat(id, user.id) });
    case "hold":
      await holdTreat(id, user.id, body.orderId);
      return NextResponse.json({ ok: true });
    case "accept":
    case "decline":
      await respondToTreat(id, user.id, body.action === "accept");
      return NextResponse.json({ ok: true });
    case "dismiss":
      await dismissSuggestion(id, user.id);
      return NextResponse.json({ ok: true });
    default:
      throw new Error("BAD_REQUEST");
  }
});
