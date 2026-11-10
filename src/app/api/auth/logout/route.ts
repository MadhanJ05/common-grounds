import { NextResponse } from "next/server";
import { endSession } from "@/lib/session";
import { siteUrl } from "@/lib/api";

export async function POST() {
  await endSession();
  return NextResponse.redirect(siteUrl("/"), { status: 303 });
}
