import "server-only";
import { NextResponse } from "next/server";
import { PayPalError } from "@/lib/paypal";
import { currentUser } from "@/lib/session";
import type { User } from "@/db";

const KNOWN: Record<string, number> = {
  UNAUTHENTICATED: 401,
  NOT_FOUND: 404,
  NOT_IN_CIRCLE: 403,
  NOT_VISIBLE: 403,
  ALREADY_TAKEN: 409,
  NOT_PENDING: 409,
  NOT_SUGGESTED: 409,
  NOT_REDEEMABLE: 409,
  ORDER_MISMATCH: 400,
  BAD_REQUEST: 400,
  PAYPAL_NOT_CONFIGURED: 503,
};

/** Wraps a route handler: requires a signed-in user and turns thrown errors into JSON. */
export function withUser<C>(handler: (req: Request, user: User, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C) => {
    try {
      const user = await currentUser();
      if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
      return await handler(req, user, ctx);
    } catch (e) {
      if (e instanceof PayPalError) {
        console.error(e.message, JSON.stringify(e.details));
        return NextResponse.json({ error: "PAYPAL_ERROR", message: e.message }, { status: 502 });
      }
      const code = e instanceof Error ? e.message : "ERROR";
      if (code in KNOWN) return NextResponse.json({ error: code }, { status: KNOWN[code] });
      console.error(e);
      return NextResponse.json({ error: "ERROR" }, { status: 500 });
    }
  };
}

/** Absolute URL on the public site. Behind Render's proxy, `req.url` is an internal address, so use APP_URL. */
export function siteUrl(path: string) {
  return new URL(path, process.env.APP_URL ?? "http://localhost:3000");
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new Error("BAD_REQUEST");
  }
}
