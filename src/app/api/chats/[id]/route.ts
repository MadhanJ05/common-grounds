import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db, messages, treats } from "@/db";
import { withUser } from "@/lib/api";
import { connectionFor } from "@/lib/circle";
import { expireStaleTreats } from "@/lib/treats";

/** Polled by the chat screen: all messages plus the treats in this chat. */
export const GET = withUser<{ params: Promise<{ id: string }> }>(async (_req, user, { params }) => {
  const { id } = await params;
  const conn = await connectionFor(user.id, id);
  if (!conn) throw new Error("NOT_FOUND");
  await expireStaleTreats();
  const [msgs, ts] = await Promise.all([
    db.select().from(messages).where(eq(messages.connectionId, id)).orderBy(asc(messages.createdAt)),
    db.select().from(treats).where(eq(treats.connectionId, id)).orderBy(asc(treats.createdAt)),
  ]);
  return NextResponse.json({
    messages: msgs.map((m) => ({
      id: m.id,
      body: m.body,
      kind: m.kind,
      mine: m.senderId === user.id,
      createdAt: m.createdAt,
    })),
    treats: ts
      .filter((t) => t.status !== "dismissed")
      .map((t) => ({
        id: t.id,
        status: t.status,
        cafeId: t.cafeId,
        itemName: t.itemName,
        amountCents: t.amountCents,
        meetLabel: t.meetLabel,
        planQuote: t.planQuote,
        reading: t.reading,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        role: t.fromUserId === user.id ? "giver" : t.toUserId === user.id ? "receiver" : null,
      })),
  });
});
