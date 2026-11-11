import { notFound, redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { cafes, db, users } from "@/db";
import { Shell } from "@/components/Shell";
import { Checkout } from "@/components/Checkout";
import { circleAccess, displayName } from "@/lib/circle";
import { cardComplete, currentUser } from "@/lib/session";
import { treatsToRedeem } from "@/lib/treats";
import { SANDBOX_BUYER } from "@/lib/demo";

export default async function CafeCheckout(props: PageProps<"/cafes/[id]/checkout">) {
  const user = await currentUser();
  if (!user) redirect("/");
  if (!cardComplete(user)) redirect("/onboarding");
  const { id } = await props.params;
  const [cafe] = await db.select().from(cafes).where(eq(cafes.id, id)).limit(1);
  if (!cafe) notFound();

  const waiting = await treatsToRedeem(user.id, cafe.id);
  const givers = waiting.length
    ? await db.select().from(users).where(inArray(users.id, waiting.map((t) => t.fromUserId!)))
    : [];
  const access = await circleAccess(user.id, cafe.id);

  return (
    <Shell back={{ href: `/cafes/${cafe.id}`, label: cafe.name }}>
      <div className="mb-5 rounded-2xl border border-dashed border-line px-4 py-3 text-xs text-ink-soft">
        This screen stands in for the café&apos;s own checkout (a counter tablet or a QR code at the till). Payments
        run in the PayPal sandbox. Test buyer: <span className="font-mono">{SANDBOX_BUYER.email}</span> /{" "}
        <span className="font-mono">{SANDBOX_BUYER.password}</span>
      </div>
      <Checkout
        cafe={{ id: cafe.id, name: cafe.name, acceptsPaypal: cafe.acceptsPaypal, menu: cafe.menu }}
        inCircle={Boolean(access)}
        treats={waiting.map((t) => ({
          id: t.id,
          itemName: t.itemName,
          amountCents: t.amountCents,
          meetLabel: t.meetLabel,
          from: displayName(givers.find((g) => g.id === t.fromUserId)!),
        }))}
      />
    </Shell>
  );
}
