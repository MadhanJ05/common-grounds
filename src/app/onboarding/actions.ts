"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { ageOn } from "@/lib/circle";
import { requireUser } from "@/lib/session";

export type CardFormState = { error?: string; saved?: boolean };

const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);

export async function saveCard(_prev: CardFormState, form: FormData): Promise<CardFormState> {
  const user = await requireUser();
  const nickname = clean(form.get("nickname"), 24);
  const promptInto = clean(form.get("promptInto"), 140);
  const promptAsk = clean(form.get("promptAsk"), 140);
  const promptMeet = clean(form.get("promptMeet"), 140);
  const ageMin = Number(form.get("ageMin"));
  const ageMax = Number(form.get("ageMax"));
  const showRealName = form.get("showRealName") === "on";
  const onlyVerified = form.get("onlyVerified") === "on";

  if (nickname.length < 2) return { error: "Pick a nickname (2+ characters)." };
  if (!promptInto || !promptAsk || !promptMeet) return { error: "Answer all three prompts." };
  if (!Number.isInteger(ageMin) || !Number.isInteger(ageMax) || ageMin < 18 || ageMax > 99 || ageMin > ageMax)
    return { error: "Age range must be between 18 and 99, low to high." };

  // A PayPal-verified birthdate can't be overwritten by hand.
  let birthdate = user.birthdate;
  if (!user.ageVerified) {
    const typed = clean(form.get("birthdate"), 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(typed)) return { error: "Add your date of birth." };
    if (ageOn(typed) < 18) return { error: "Common Grounds is for people 18 and over." };
    birthdate = typed;
  }

  const myAge = birthdate ? ageOn(birthdate) : null;
  if (myAge !== null && (myAge < ageMin || myAge > ageMax))
    return { error: `Your range should include your own age (${myAge}).` };

  await db
    .update(users)
    .set({ nickname, promptInto, promptAsk, promptMeet, ageMin, ageMax, showRealName, onlyVerified, birthdate })
    .where(eq(users.id, user.id));

  if (form.get("from") === "onboarding") redirect("/home");
  return { saved: true };
}
