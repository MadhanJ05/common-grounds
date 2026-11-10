import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { cafes, db } from "@/db";
import { readJson, withUser } from "@/lib/api";
import { createOrder } from "@/lib/paypal";

/** Café checkout: create a PayPal order (intent CAPTURE) for one menu item. */
export const POST = withUser<{ params: Promise<{ id: string }> }>(async (req, user, { params }) => {
  const { id } = await params;
  const { itemId } = await readJson<{ itemId: string }>(req);
  const [cafe] = await db.select().from(cafes).where(eq(cafes.id, id)).limit(1);
  if (!cafe || !cafe.acceptsPaypal) throw new Error("NOT_FOUND");
  const item = cafe.menu.find((m) => m.id === itemId);
  if (!item) throw new Error("BAD_REQUEST");

  const order = await createOrder({
    intent: "CAPTURE",
    cafeName: cafe.name,
    itemName: item.name,
    amountCents: item.priceCents,
    referenceId: cafe.id,
    customId: user.id,
    description: `${item.name} at ${cafe.name}`,
    requestId: `buy-${user.id}-${cafe.id}-${Date.now()}`,
  });
  return NextResponse.json({ orderId: order.id });
});
