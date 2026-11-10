"use client";

import { useState } from "react";
import Link from "next/link";
import { PayPalButton } from "@/components/PayPalShell";

export type TreatView = {
  id: string;
  status: "suggested" | "held" | "accepted" | "redeemed" | "declined" | "expired" | "dismissed";
  cafeId: string;
  itemName: string;
  amountCents: number;
  meetLabel: string;
  planQuote: string;
  reading: string;
  createdAt: string;
  role: "giver" | "receiver" | null;
};

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;

export function TreatCard({
  treat,
  cafeName,
  otherName,
  onChange,
}: {
  treat: TreatView;
  cafeName: string;
  otherName: string;
  onChange: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  async function act(body: Record<string, unknown>) {
    const res = await fetch(`/api/treats/${treat.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        json.error === "ALREADY_TAKEN" ? `${otherName} just treated you first!` : (json.message ?? json.error ?? "Something went wrong");
      throw new Error(msg);
    }
    return json;
  }

  async function simple(action: "accept" | "decline" | "dismiss") {
    setBusy(true);
    setError(null);
    try {
      await act({ action });
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const header = (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-medium uppercase tracking-wider text-accent">✦ Coffee&apos;s on me</span>
      <button onClick={() => setShowWhy(!showWhy)} className="text-[11px] text-ink-soft underline-offset-2 hover:underline">
        {showWhy ? "hide" : "how Claude read it"}
      </button>
    </div>
  );
  const why = showWhy && (
    <div className="mt-2 rounded-xl bg-surface p-3 text-xs text-ink-soft">
      <p>“{treat.planQuote}”</p>
      <p className="mt-1">→ {treat.reading}</p>
    </div>
  );
  const plan = (
    <p className="mt-1.5 font-serif text-[19px] leading-snug">
      {treat.itemName} at {cafeName}
      <span className="block text-[15px] text-ink-soft">
        {treat.meetLabel} · {usd(treat.amountCents)}
      </span>
    </p>
  );
  const box = (children: React.ReactNode, tone: "accent" | "quiet" = "accent") => (
    <div className={`my-3 rounded-3xl p-4 ${tone === "accent" ? "bg-accent-soft" : "border border-line bg-surface"}`}>
      {header}
      {plan}
      {why}
      {children}
      {error && <p className="mt-2 text-sm text-warn">{error}</p>}
    </div>
  );

  switch (treat.status) {
    case "suggested":
      return box(
        <>
          <p className="mt-2 text-sm text-ink-soft">
            Sounds like a plan. Treat {otherName}? PayPal only holds {usd(treat.amountCents)}, and it&apos;s charged
            when they pick it up.
          </p>
          <div className="mt-3">
            <PayPalButton
              type="pay"
              presentationMode="auto"
              createOrder={async () => {
                setError(null);
                const { orderId } = await act({ action: "order" });
                return { orderId };
              }}
              onApprove={async ({ orderId }) => {
                try {
                  await act({ action: "hold", orderId });
                  onChange();
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                }
              }}
              onError={(e) => setError(e instanceof Error ? e.message : "PayPal error")}
            />
          </div>
          <button
            disabled={busy}
            onClick={() => simple("dismiss")}
            className="mt-2 w-full text-center text-xs text-ink-soft hover:text-ink"
          >
            Not now
          </button>
        </>,
      );
    case "held":
      return treat.role === "receiver"
        ? box(
            <>
              <p className="mt-2 text-sm">
                <b>{otherName}</b> is treating you. Pick it up at {cafeName}&apos;s checkout.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  disabled={busy}
                  onClick={() => simple("decline")}
                  className="flex-1 rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-ink-soft"
                >
                  No thanks
                </button>
                <button
                  disabled={busy}
                  onClick={() => simple("accept")}
                  className="flex-[2] rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-bg"
                >
                  Accept
                </button>
              </div>
            </>,
          )
        : box(
            <p className="mt-2 text-sm text-ink-soft">
              You&apos;re treating {otherName}. {usd(treat.amountCents)} is held in your PayPal, waiting for them to
              accept.
            </p>,
          );
    case "accepted":
      return treat.role === "receiver"
        ? box(
            <>
              <p className="mt-2 text-sm">Accepted. Show this at {cafeName}&apos;s checkout.</p>
              <Link
                href={`/cafes/${treat.cafeId}/checkout`}
                className="mt-3 block rounded-full bg-ink px-4 py-2.5 text-center text-sm font-semibold text-bg"
              >
                Go to checkout
              </Link>
            </>,
          )
        : box(
            <p className="mt-2 text-sm text-ink-soft">
              {otherName} accepted. {usd(treat.amountCents)} stays on hold until they pick it up.
            </p>,
          );
    case "redeemed":
      return box(<p className="mt-2 text-sm text-ok">Picked up ✓ · {usd(treat.amountCents)} paid through PayPal</p>, "quiet");
    case "declined":
    case "expired":
      return box(
        <p className="mt-2 text-sm text-ink-soft">
          {treat.status === "declined" ? "Declined" : "Not picked up"}: the PayPal hold was released, so there was no charge.
        </p>,
        "quiet",
      );
    default:
      return null;
  }
}
