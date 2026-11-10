import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { loginUrl, paypalConfigured } from "@/lib/paypal";
import { siteUrl } from "@/lib/api";

/**
 * Starts Log in with PayPal. `?basic=1` asks only for `openid`: used as an automatic retry when
 * the PayPal app isn't allowed to share profile details (name, email, birthdate).
 */
export async function GET(req: Request) {
  if (!paypalConfigured()) return NextResponse.redirect(siteUrl("/?error=paypal-not-configured"));
  const basic = new URL(req.url).searchParams.get("basic") === "1";
  const state = `${crypto.randomUUID()}${basic ? ".basic" : ""}`;
  (await cookies()).set("cg_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  const redirectUri = siteUrl("/api/auth/paypal/callback").toString();
  return NextResponse.redirect(loginUrl(redirectUri, state, basic ? "openid" : undefined));
}
