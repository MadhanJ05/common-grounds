import { redirect } from "next/navigation";
import { like } from "drizzle-orm";
import { db, users } from "@/db";
import { Brand } from "@/components/Shell";
import { cardComplete, currentUser } from "@/lib/session";
import { SANDBOX_BUYER } from "@/lib/demo";

export default async function Landing(props: PageProps<"/">) {
  const user = await currentUser();
  if (user) redirect(cardComplete(user) ? "/home" : "/onboarding");
  const { error } = await props.searchParams;

  const demoPeople =
    process.env.DEMO_LOGIN === "false"
      ? []
      : await db.select().from(users).where(like(users.paypalUserId, "demo:%"));

  const step = (n: number, title: string, body: string) => (
    <li className="flex gap-4">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
        {n}
      </span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-ink-soft">{body}</p>
      </div>
    </li>
  );

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-10">
      <Brand />
      <h1 className="mt-14 font-serif text-[44px] leading-[1.05] tracking-tight">
        Grab a coffee
        <br />
        to meet someone.
      </h1>
      <p className="mt-5 text-lg text-ink-soft">
        Pay for your coffee with PayPal and you join that café&apos;s circle: the other people who bought there this
        week. Pay any other way and you just get coffee.
      </p>

      {error && (
        <p className="mt-6 rounded-xl bg-surface-2 p-3 text-sm text-warn">
          {error === "paypal-not-configured"
            ? "PayPal sign-in isn't configured on this server yet."
            : "Signing in with PayPal didn't work. Please try again."}
        </p>
      )}

      <a
        href="/api/auth/paypal/login"
        className="mt-8 flex items-center justify-center gap-2 rounded-full bg-[#ffc439] px-6 py-3.5 text-[15px] font-semibold text-[#111] shadow-sm transition hover:brightness-95"
      >
        Log in with <span className="font-extrabold italic text-[#003087]">Pay</span>
        <span className="-ml-2 font-extrabold italic text-[#0070e0]">Pal</span>
      </a>
      <p className="mt-2 text-center text-xs text-ink-soft">
        PayPal shares your name and date of birth so your age shows as verified. Your age is never shown to anyone.
      </p>

      <ol className="mt-12 space-y-5">
        {step(1, "Buy a coffee with PayPal", "At any café on the map. That's your ticket in.")}
        {step(2, "Meet the café's circle for 7 days", "A few people, a few words each. No photos, no swiping.")}
        {step(3, "Say hi", "A chat opens only when you both do. Pass, and they'll never know.")}
        {step(
          4,
          "Make a plan, and Claude handles the coffee",
          "Say “tmrw after my 10am, the place on Main?” and Claude sets up a PayPal hold so one of you can treat the other.",
        )}
      </ol>

      {demoPeople.length > 0 && (
        <div className="mt-12 rounded-2xl border border-dashed border-line p-4">
          <p className="text-sm font-medium">Demo sign-in</p>
          <p className="mb-3 text-xs text-ink-soft">
            For judges and the demo video: jump in as a sample person. Open the other one in a private window to
            chat with yourself.
          </p>
          <div className="flex gap-2">
            {demoPeople.map((p) => (
              <form key={p.id} action="/api/auth/demo" method="post" className="flex-1">
                <input type="hidden" name="userId" value={p.id} />
                <button className="w-full rounded-full border border-line bg-surface px-4 py-2 text-sm hover:bg-surface-2">
                  Continue as {p.nickname}
                </button>
              </form>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-surface-2 p-3 text-xs">
            <p className="font-medium">PayPal sandbox test buyer (fake money)</p>
            <p className="mt-1 font-mono text-ink-soft">{SANDBOX_BUYER.email}</p>
            <p className="font-mono text-ink-soft">{SANDBOX_BUYER.password}</p>
          </div>
        </div>
      )}

      <p className="mt-auto pt-12 text-center text-xs text-ink-soft">
        A PayPal AI Hackathon project · PayPal sandbox only · No real money moves.
      </p>
    </div>
  );
}
