import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, inArray } from "drizzle-orm";
import { cafes, db, messages } from "@/db";
import { Shell, SectionTitle } from "@/components/Shell";
import { activeCircles, displayName, myConnections } from "@/lib/circle";
import { cardComplete, currentUser } from "@/lib/session";
import { TZ } from "@/lib/time";

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", hourCycle: "h23" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default async function Home() {
  const user = await currentUser();
  if (!user) redirect("/");
  if (!cardComplete(user)) redirect("/onboarding");

  const circles = await activeCircles(user.id);
  const circleCafes = circles.length
    ? await db.select().from(cafes).where(inArray(cafes.id, circles.map((c) => c.cafeId)))
    : [];
  const conns = await myConnections(user.id);
  const lastLines = conns.length
    ? await db
        .select()
        .from(messages)
        .where(inArray(messages.connectionId, conns.map((c) => c.connection.id)))
        .orderBy(desc(messages.createdAt))
    : [];

  return (
    <Shell active="home">
      <p className="text-ink-soft">{greeting()},</p>
      <h1 className="font-serif text-3xl">{displayName(user)}</h1>

      <SectionTitle hint="7 days from your last PayPal coffee">Your circles</SectionTitle>
      {circles.length === 0 ? (
        <div className="rounded-3xl border border-line bg-surface p-5">
          <p className="font-medium">You&apos;re not in any circle yet.</p>
          <p className="mt-1 text-sm text-ink-soft">
            Buy a coffee with PayPal at any café on the map and you&apos;ll meet the people who bought there this week.
          </p>
          <Link href="/map" className="mt-4 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-bg">
            Find a café
          </Link>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {circles
            .sort((a, b) => b.until.getTime() - a.until.getTime())
            .map((c) => {
              const cafe = circleCafes.find((k) => k.id === c.cafeId)!;
              return (
                <li key={c.cafeId}>
                  <Link
                    href={`/cafes/${cafe.id}`}
                    className="flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3.5 hover:bg-surface-2"
                  >
                    <div>
                      <p className="font-medium">{cafe.name}</p>
                      <p className="text-sm text-ink-soft">{cafe.neighborhood}</p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        c.daysLeft <= 2 ? "bg-accent-soft text-accent" : "bg-ok-soft text-ok"
                      }`}
                    >
                      {c.daysLeft} {c.daysLeft === 1 ? "day" : "days"} left
                    </span>
                  </Link>
                </li>
              );
            })}
        </ul>
      )}

      <SectionTitle>Conversations</SectionTitle>
      {conns.length === 0 ? (
        <p className="text-sm text-ink-soft">
          When you and someone both say hi, your chat shows up here. It stays open even after your circle access ends.
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {conns.map(({ connection, other, cafe }) => {
            const last = lastLines.find((m) => m.connectionId === connection.id);
            return (
              <li key={connection.id}>
                <Link href={`/chats/${connection.id}`} className="block px-4 py-3.5 hover:bg-surface-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-medium">{displayName(other)}</p>
                    <p className="text-xs text-ink-soft">met at {cafe.name}</p>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-ink-soft">{last ? last.body : "You both said hi. Say something!"}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <SectionTitle>Where to next</SectionTitle>
      <Link
        href="/map"
        className="block rounded-3xl bg-accent-soft p-5 text-ink transition hover:brightness-[0.98]"
      >
        <p className="font-serif text-lg">Every café has its own circle.</p>
        <p className="mt-1 text-sm text-ink-soft">See nearby cafés that take PayPal, and buy your next coffee somewhere new.</p>
      </Link>
    </Shell>
  );
}
