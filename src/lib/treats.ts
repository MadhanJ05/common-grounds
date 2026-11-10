import "server-only";
import { and, eq, inArray, lt } from "drizzle-orm";
import { cafes, connections, db, messages, treats, users, visits, type Cafe, type Treat } from "@/db";
import {
  authorizeOrder,
  captureAuthorization,
  createOrder,
  paypalConfigured,
  voidAuthorization,
} from "@/lib/paypal";
import { displayName } from "@/lib/circle";

/** PayPal orders that were never approved go stale after a few hours; make a fresh one before then. */
const ORDER_FRESH_MS = 2.5 * 60 * 60 * 1000;
/** A held treat that isn't picked up by this long after the planned time is voided. */
const GRACE_MS = 6 * 60 * 60 * 1000;

const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export async function postSystemNote(connectionId: string, body: string) {
  await db.insert(messages).values({ connectionId, body, kind: "system" });
}

/** Creates (or refreshes) the PayPal AUTHORIZE order behind a suggested treat. */
export async function ensureTreatOrder(treat: Treat, cafe: Cafe): Promise<string> {
  const fresh =
    treat.paypalOrderId &&
    treat.paypalOrderCreatedAt &&
    Date.now() - treat.paypalOrderCreatedAt.getTime() < ORDER_FRESH_MS;
  if (fresh) return treat.paypalOrderId!;

  const order = await createOrder({
    intent: "AUTHORIZE",
    cafeName: cafe.name,
    itemName: `${treat.itemName} (treat)`,
    amountCents: treat.amountCents,
    referenceId: cafe.id,
    customId: treat.id,
    description: `Coffee's on me: ${treat.itemName} at ${cafe.name}, ${treat.meetLabel}. Charged only when it's picked up.`,
    requestId: `treat-${treat.id}-${Date.now()}`,
  });
  await db
    .update(treats)
    .set({ paypalOrderId: order.id, paypalOrderCreatedAt: new Date(), updatedAt: new Date() })
    .where(eq(treats.id, treat.id));
  return order.id;
}

async function loadTreat(treatId: string) {
  const [row] = await db
    .select({ treat: treats, cafe: cafes, connection: connections })
    .from(treats)
    .innerJoin(cafes, eq(cafes.id, treats.cafeId))
    .innerJoin(connections, eq(connections.id, treats.connectionId))
    .where(eq(treats.id, treatId))
    .limit(1);
  return row ?? null;
}

function isMember(conn: { userA: string; userB: string }, userId: string) {
  return conn.userA === userId || conn.userB === userId;
}

async function nameOf(userId: string) {
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return u ? displayName(u) : "Someone";
}

/** Called by the PayPal button's createOrder. */
export async function orderForTreat(treatId: string, userId: string) {
  const row = await loadTreat(treatId);
  if (!row || !isMember(row.connection, userId)) throw new Error("NOT_FOUND");
  if (row.treat.status !== "suggested") throw new Error("ALREADY_TAKEN");
  if (!paypalConfigured()) throw new Error("PAYPAL_NOT_CONFIGURED");
  return ensureTreatOrder(row.treat, row.cafe);
}

/** The treater approved in PayPal: authorize (hold) the money, don't capture it yet. */
export async function holdTreat(treatId: string, userId: string, orderId: string) {
  const row = await loadTreat(treatId);
  if (!row || !isMember(row.connection, userId)) throw new Error("NOT_FOUND");
  const { treat, connection, cafe } = row;
  if (treat.status !== "suggested") throw new Error("ALREADY_TAKEN");
  if (treat.paypalOrderId !== orderId) throw new Error("ORDER_MISMATCH");

  const order = await authorizeOrder(orderId);
  const auth = order.purchase_units?.[0]?.payments?.authorizations?.[0];
  if (!auth || !["CREATED", "PENDING"].includes(auth.status)) throw new Error("AUTHORIZATION_FAILED");

  const toUserId = connection.userA === userId ? connection.userB : connection.userA;
  // Only one person can win the race to treat.
  const updated = await db
    .update(treats)
    .set({ status: "held", fromUserId: userId, toUserId, paypalAuthorizationId: auth.id, updatedAt: new Date() })
    .where(and(eq(treats.id, treat.id), eq(treats.status, "suggested")))
    .returning();
  if (updated.length === 0) {
    await voidAuthorization(auth.id).catch(() => {});
    throw new Error("ALREADY_TAKEN");
  }

  const [from, to] = await Promise.all([nameOf(userId), nameOf(toUserId)]);
  await postSystemNote(
    connection.id,
    `☕ ${from} is treating ${to} to a ${treat.itemName.toLowerCase()} at ${cafe.name} · ${treat.meetLabel}. ${usd(treat.amountCents)} is held in PayPal and only charged when it's picked up.`,
  );
  return updated[0];
}

export async function respondToTreat(treatId: string, userId: string, accept: boolean) {
  const row = await loadTreat(treatId);
  if (!row || row.treat.toUserId !== userId) throw new Error("NOT_FOUND");
  const { treat, cafe } = row;
  if (treat.status !== "held") throw new Error("NOT_PENDING");

  if (accept) {
    await db.update(treats).set({ status: "accepted", updatedAt: new Date() }).where(eq(treats.id, treat.id));
    await postSystemNote(
      treat.connectionId,
      `${await nameOf(userId)} accepted. Show the treat at ${cafe.name}'s checkout to pick it up.`,
    );
  } else {
    if (treat.paypalAuthorizationId) await voidAuthorization(treat.paypalAuthorizationId);
    await db.update(treats).set({ status: "declined", updatedAt: new Date() }).where(eq(treats.id, treat.id));
    await postSystemNote(treat.connectionId, `The treat was declined, so the PayPal hold was released. No charge.`);
  }
}

export async function dismissSuggestion(treatId: string, userId: string | null, reason?: string) {
  const row = await loadTreat(treatId);
  if (!row || (userId && !isMember(row.connection, userId))) throw new Error("NOT_FOUND");
  if (row.treat.status !== "suggested") throw new Error("NOT_SUGGESTED");
  await db.update(treats).set({ status: "dismissed", updatedAt: new Date() }).where(eq(treats.id, treatId));
  if (reason) console.info(`[treat ${treatId}] dismissed: ${reason}`);
}

/** Treats waiting to be picked up by this user at this café. */
export async function treatsToRedeem(userId: string, cafeId: string) {
  await expireStaleTreats();
  return db
    .select()
    .from(treats)
    .where(and(eq(treats.toUserId, userId), eq(treats.cafeId, cafeId), inArray(treats.status, ["held", "accepted"])));
}

/**
 * At the café's checkout: capture the held authorization. The café gets paid,
 * the recipient gets their coffee, and it counts as a PayPal purchase, so it opens the circle too.
 */
export async function redeemTreat(treatId: string, userId: string, cafeId: string) {
  const row = await loadTreat(treatId);
  if (!row || row.treat.toUserId !== userId || row.treat.cafeId !== cafeId) throw new Error("NOT_FOUND");
  const { treat, cafe } = row;
  if (!["held", "accepted"].includes(treat.status) || !treat.paypalAuthorizationId) throw new Error("NOT_REDEEMABLE");

  const capture = await captureAuthorization(treat.paypalAuthorizationId);
  if (!["COMPLETED", "PENDING"].includes(capture.status)) throw new Error("CAPTURE_FAILED");

  await db
    .update(treats)
    .set({ status: "redeemed", paypalCaptureId: capture.id, updatedAt: new Date() })
    .where(eq(treats.id, treat.id));
  await db.insert(visits).values({
    userId,
    cafeId,
    method: "treat",
    itemName: treat.itemName,
    amountCents: treat.amountCents,
    paypalOrderId: treat.paypalOrderId,
    paypalCaptureId: capture.id,
  });
  await postSystemNote(
    treat.connectionId,
    `${await nameOf(userId)} picked up the ${treat.itemName.toLowerCase()} at ${cafe.name}. The PayPal hold was captured. Enjoy!`,
  );
}

/** Void holds nobody picked up. Cheap enough to run on every read. */
export async function expireStaleTreats() {
  const cutoff = new Date(Date.now() - GRACE_MS);
  const stale = await db
    .select()
    .from(treats)
    .where(and(inArray(treats.status, ["held", "accepted"]), lt(treats.meetAt, cutoff)));
  for (const t of stale) {
    try {
      if (t.paypalAuthorizationId) await voidAuthorization(t.paypalAuthorizationId);
    } catch (e) {
      console.error(`[treat ${t.id}] void failed`, e);
    }
    await db.update(treats).set({ status: "expired", updatedAt: new Date() }).where(eq(treats.id, t.id));
    await postSystemNote(t.connectionId, `The treat wasn't picked up, so the PayPal hold was released. No charge.`);
  }
  // Suggestions nobody acted on just quietly go away.
  await db
    .update(treats)
    .set({ status: "dismissed", updatedAt: new Date() })
    .where(and(eq(treats.status, "suggested"), lt(treats.meetAt, new Date())));
}
