import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { cafes, db, visits } from "@/db";
import { readJson, withUser } from "@/lib/api";

/**
 * "Pay another way" (card or cash at the counter). You get your coffee, and that's it:
 * only PayPal purchases open the café's circle. Simulated, since there's no real card terminal.
 */
export const POST = withUser<{ params: Promise<{ id: string }> }>(async (req, user, { params }) => {
  const { id } = await params;
  const { itemId } = await readJson<{ itemId: string }>(req);
  const [cafe] = await db.select().from(cafes).where(eq(cafes.id, id)).limit(1);
  const item = cafe?.menu.find((m) => m.id === itemId);
  if (!cafe || !item) throw new Error("NOT_FOUND");
  await db.insert(visits).values({
    userId: user.id,
    cafeId: cafe.id,
    method: "other",
    itemName: item.name,
    amountCents: item.priceCents,
  });
  return NextResponse.json({ ok: true });
});
