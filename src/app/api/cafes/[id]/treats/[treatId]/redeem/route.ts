import { NextResponse } from "next/server";
import { withUser } from "@/lib/api";
import { redeemTreat } from "@/lib/treats";
import { circleAccess } from "@/lib/circle";

/** Pick up a treated coffee at this café: captures the PayPal hold. */
export const POST = withUser<{ params: Promise<{ id: string; treatId: string }> }>(async (_req, user, { params }) => {
  const { id, treatId } = await params;
  await redeemTreat(treatId, user.id, id);
  const access = await circleAccess(user.id, id);
  return NextResponse.json({ ok: true, until: access?.until ?? null });
});
