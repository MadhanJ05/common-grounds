import { NextResponse } from "next/server";
import { readJson, withUser } from "@/lib/api";
import { sayHi } from "@/lib/circle";

export const POST = withUser(async (req, user) => {
  const { toUserId, cafeId } = await readJson<{ toUserId: string; cafeId: string }>(req);
  if (!toUserId || !cafeId) throw new Error("BAD_REQUEST");
  const { connectionId } = await sayHi(user, toUserId, cafeId);
  return NextResponse.json({ connectionId });
});
