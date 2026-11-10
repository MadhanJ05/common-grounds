import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { loginUrl, paypalConfigured } from "@/lib/paypal";

export async function GET() {
  if (!paypalConfigured()) {
    return NextResponse.redirect(new URL("/?error=paypal-not-configured", process.env.APP_URL ?? "http://localhost:3000"));
  }
  const state = crypto.randomUUID();
  (await cookies()).set("cg_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  const redirectUri = `${process.env.APP_URL ?? "http://localhost:3000"}/api/auth/paypal/callback`;
  return NextResponse.redirect(loginUrl(redirectUri, state));
}
