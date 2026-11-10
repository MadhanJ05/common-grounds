import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { cafes, db, visits } from "@/db";
import { readJson, withUser } from "@/lib/api";
import { captureOrder, getOrder } from "@/lib/paypal";
import { circleAccess } from "@/lib/circle";

/**
 * After the buyer approves in PayPal: capture the payment, then record the visit.
 * A verified, completed PayPal capture is what opens the café's circle for 7 days.
 */
export const POST = withUser<{ params: Promise<{ id: string; orderId: string }> }>(async (req, user, { params }) => {
  const { id, orderId } = await params;
  const { itemId } = await readJson<{ itemId: string }>(req);
  const [cafe] = await db.select().from(cafes).where(eq(cafes.id, id)).limit(1);
  if (!cafe) throw new Error("NOT_FOUND");

  const item = cafe.menu.find((m) => m.id === itemId);
  if (!item) throw new Error("BAD_REQUEST");

  // Check it's the order we created for this person, at this café, for this item, before taking money.
  const before = await getOrder(orderId);
  const unitBefore = before.purchase_units?.[0];
  const amountBefore = Math.round(Number(unitBefore?.amount?.value ?? 0) * 100);
  if (unitBefore?.reference_id !== cafe.id || unitBefore?.custom_id !== user.id || amountBefore !== item.priceCents) {
    throw new Error("ORDER_MISMATCH");
  }

  const order = await captureOrder(orderId);
  const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
  if (order.status !== "COMPLETED" || !capture || capture.status !== "COMPLETED") {
    return NextResponse.json({ error: "NOT_COMPLETED", status: order.status }, { status: 402 });
  }
  const paidCents = Math.round(Number(capture.amount?.value ?? amountBefore / 100) * 100);

  await db.insert(visits).values({
    userId: user.id,
    cafeId: cafe.id,
    method: "paypal",
    itemName: item.name,
    amountCents: paidCents,
    paypalOrderId: order.id,
    paypalCaptureId: capture.id,
  });

  const access = await circleAccess(user.id, cafe.id);
  return NextResponse.json({ ok: true, until: access?.until ?? null });
});
