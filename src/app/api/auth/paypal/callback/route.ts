import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { exchangeLoginCode } from "@/lib/paypal";
import { cardComplete, startSession } from "@/lib/session";

const appUrl = () => process.env.APP_URL ?? "http://localhost:3000";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const expected = jar.get("cg_oauth_state")?.value;
  jar.delete("cg_oauth_state");

  if (!code || !state || state !== expected) {
    return NextResponse.redirect(new URL("/?error=login-failed", appUrl()));
  }

  try {
    const info = await exchangeLoginCode(code);
    const [existing] = await db.select().from(users).where(eq(users.paypalUserId, info.userId)).limit(1);

    // A birthdate that came from PayPal is "verified"; it replaces any self-reported one.
    const verified = info.birthdate
      ? { birthdate: info.birthdate, ageVerified: true }
      : {};

    let userId: string;
    if (existing) {
      await db
        .update(users)
        .set({ realName: info.name ?? existing.realName, email: info.email ?? existing.email, ...verified })
        .where(eq(users.id, existing.id));
      userId = existing.id;
    } else {
      const [created] = await db
        .insert(users)
        .values({ paypalUserId: info.userId, realName: info.name, email: info.email, ...verified })
        .returning();
      userId = created.id;
    }

    console.info(
      `[login] PayPal user signed in; birthdate ${info.birthdate ? "shared" : "not shared"}; fields: ${Object.keys(info.raw).join(",")}`,
    );
    await startSession(userId);
    const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return NextResponse.redirect(new URL(cardComplete(u) ? "/home" : "/onboarding", appUrl()));
  } catch (e) {
    console.error("[login] failed", e);
    return NextResponse.redirect(new URL("/?error=login-failed", appUrl()));
  }
}
