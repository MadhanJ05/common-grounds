import Link from "next/link";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { cafes, db } from "@/db";
import { Shell } from "@/components/Shell";
import { CafeMapLoader } from "@/components/CafeMapLoader";
import { activeCircles } from "@/lib/circle";
import { cardComplete, currentUser } from "@/lib/session";

export default async function MapPage() {
  const user = await currentUser();
  if (!user) redirect("/");
  if (!cardComplete(user)) redirect("/onboarding");

  const all = await db.select().from(cafes).orderBy(asc(cafes.name));
  const circles = await activeCircles(user.id);
  const pins = all.map((c) => {
    const circle = circles.find((x) => x.cafeId === c.id);
    return {
      id: c.id,
      name: c.name,
      neighborhood: c.neighborhood,
      lat: c.lat,
      lng: c.lng,
      acceptsPaypal: c.acceptsPaypal,
      daysLeft: circle?.daysLeft ?? null,
    };
  });
  const sorted = [...pins].sort((a, b) => Number(a.daysLeft !== null) - Number(b.daysLeft !== null) || Number(b.acceptsPaypal) - Number(a.acceptsPaypal));

  return (
    <Shell active="map">
      <p className="text-xs font-medium uppercase tracking-wider text-accent">Concept: a tab inside PayPal</p>
      <h1 className="font-serif text-3xl">Where to next</h1>
      <p className="mt-1 text-ink-soft">Nearby cafés that take PayPal. Buy your next coffee at one to meet a new circle.</p>

      <div className="mt-4 h-[340px] overflow-hidden rounded-3xl border border-line">
        <CafeMapLoader pins={pins} />
      </div>

      <ul className="mt-5 space-y-2.5">
        {sorted.map((c) => (
          <li key={c.id}>
            <Link
              href={`/cafes/${c.id}`}
              className={`flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3.5 hover:bg-surface-2 ${
                c.acceptsPaypal ? "" : "opacity-60"
              }`}
            >
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-ink-soft">{c.neighborhood}</p>
              </div>
              {!c.acceptsPaypal ? (
                <span className="text-xs text-ink-soft">No PayPal</span>
              ) : c.daysLeft !== null ? (
                <span className="rounded-full bg-ok-soft px-2.5 py-1 text-xs font-medium text-ok">You&apos;re in</span>
              ) : (
                <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">New circle</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </Shell>
  );
}
