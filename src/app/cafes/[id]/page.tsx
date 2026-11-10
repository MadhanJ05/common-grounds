import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { cafes, db } from "@/db";
import { Shell, SectionTitle } from "@/components/Shell";
import { PersonCard } from "@/components/PersonCard";
import { SayHi } from "@/components/SayHi";
import { circleAccess, circleMembers } from "@/lib/circle";
import { cardComplete, currentUser } from "@/lib/session";

export default async function CafeCircle(props: PageProps<"/cafes/[id]">) {
  const user = await currentUser();
  if (!user) redirect("/");
  if (!cardComplete(user)) redirect("/onboarding");
  const { id } = await props.params;
  const [cafe] = await db.select().from(cafes).where(eq(cafes.id, id)).limit(1);
  if (!cafe) notFound();

  const access = cafe.acceptsPaypal ? await circleAccess(user.id, cafe.id) : null;
  const members = access ? await circleMembers(user, cafe.id) : [];

  return (
    <Shell back={{ href: "/home", label: "Home" }}>
      <p className="text-sm text-ink-soft">{cafe.neighborhood}</p>
      <h1 className="font-serif text-3xl">{cafe.name}</h1>
      <p className="text-sm text-ink-soft">
        {cafe.address} · {cafe.hours}
      </p>

      {!cafe.acceptsPaypal ? (
        <div className="mt-6 rounded-3xl border border-line bg-surface p-5">
          <p className="font-medium">This café doesn&apos;t take PayPal yet, so it has no circle.</p>
          <p className="mt-1 text-sm text-ink-soft">Circles open only through PayPal purchases.</p>
        </div>
      ) : !access ? (
        <div className="mt-6 rounded-3xl bg-accent-soft p-6">
          <p className="font-serif text-xl leading-snug">Buy a coffee here with PayPal to meet the people in this circle.</p>
          <p className="mt-2 text-sm text-ink-soft">
            You&apos;ll be in for 7 days, and every PayPal coffee here after that renews it.
          </p>
          <Link
            href={`/cafes/${cafe.id}/checkout`}
            className="mt-5 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-bg"
          >
            Go to checkout
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-ok-soft px-4 py-3 text-sm text-ok">
            <span>
              You&apos;re in · {access.daysLeft} {access.daysLeft === 1 ? "day" : "days"} left
            </span>
            <Link href={`/cafes/${cafe.id}/checkout`} className="font-medium underline-offset-2 hover:underline">
              Checkout
            </Link>
          </div>

          <SectionTitle hint="bought here this week">People in this circle</SectionTitle>
          {members.length === 0 ? (
            <p className="text-sm text-ink-soft">
              Nobody else here matches your age range right now. New people join every time someone buys a coffee
              here with PayPal.
            </p>
          ) : (
            <div className="space-y-4">
              {members.map((m) => (
                <PersonCard
                  key={m.id}
                  person={m}
                  footer={
                    <SayHi
                      toUserId={m.id}
                      cafeId={cafe.id}
                      name={m.displayName}
                      initial={m.hello}
                      connectionId={m.connectionId}
                    />
                  }
                />
              ))}
            </div>
          )}
          <p className="mt-6 text-center text-xs text-ink-soft">
            People here may have visited at any time this week. Nobody is shown as being here now.
          </p>
        </>
      )}
    </Shell>
  );
}
