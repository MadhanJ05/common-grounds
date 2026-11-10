import { NextResponse } from "next/server";
import { and, eq, like } from "drizzle-orm";
import { db, users } from "@/db";
import { startSession } from "@/lib/session";
import { siteUrl } from "@/lib/api";

/** Sign in as a seeded demo person (Sam, Alex). Disabled when DEMO_LOGIN=false. */
export async function POST(req: Request) {
  if (process.env.DEMO_LOGIN === "false") return NextResponse.json({ error: "DISABLED" }, { status: 403 });
  const form = await req.formData();
  const id = String(form.get("userId") ?? "");
  const [u] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), like(users.paypalUserId, "demo:%")))
    .limit(1);
  if (!u) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  await startSession(u.id);
  return NextResponse.redirect(siteUrl("/home"), { status: 303 });
}
