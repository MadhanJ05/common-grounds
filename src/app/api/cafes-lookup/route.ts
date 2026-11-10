import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { cafes, db } from "@/db";
import { withUser } from "@/lib/api";

/** id → name for cafés referenced by treats (a plan can be at a different café than where people met). */
export const GET = withUser(async (req) => {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 20);
  if (ids.length === 0) return NextResponse.json({});
  const rows = await db.select({ id: cafes.id, name: cafes.name }).from(cafes).where(inArray(cafes.id, ids));
  return NextResponse.json(Object.fromEntries(rows.map((r) => [r.id, r.name])));
});
