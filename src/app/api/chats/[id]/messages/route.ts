import { NextResponse, after } from "next/server";
import { db, messages } from "@/db";
import { readJson, withUser } from "@/lib/api";
import { connectionFor } from "@/lib/circle";
import { checkForPlan } from "@/lib/plan-agent";

export const maxDuration = 120;

export const POST = withUser<{ params: Promise<{ id: string }> }>(async (req, user, { params }) => {
  const { id } = await params;
  const conn = await connectionFor(user.id, id);
  if (!conn) throw new Error("NOT_FOUND");
  const { body } = await readJson<{ body: string }>(req);
  const text = (body ?? "").trim().slice(0, 1000);
  if (!text) throw new Error("BAD_REQUEST");

  const [msg] = await db.insert(messages).values({ connectionId: id, senderId: user.id, body: text }).returning();

  // Claude reads the chat for a settled coffee plan after the response is sent.
  after(() => checkForPlan(id));

  return NextResponse.json({ id: msg.id });
});
