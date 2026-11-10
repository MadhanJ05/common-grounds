"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PayPalButton, PayPalShell } from "@/components/PayPalShell";
import type { MenuItem } from "@/db/schema";

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;

type Done = { kind: "paypal" | "other" | "treat"; item: string };

export function Checkout({
  cafe,
  inCircle,
  treats,
}: {
  cafe: { id: string; name: string; acceptsPaypal: boolean; menu: MenuItem[] };
  inCircle: boolean;
  treats: { id: string; itemName: string; amountCents: number; meetLabel: string; from: string }[];
}) {
  const router = useRouter();
  const [itemId, setItemId] = useState(cafe.menu.find((m) => m.id === "latte")?.id ?? cafe.menu[0].id);
  const [done, setDone] = useState<Done | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const item = cafe.menu.find((m) => m.id === itemId)!;

  async function post(url: string, body?: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message ?? json.error ?? "Something went wrong");
    return json;
  }

  async function redeem(treatId: string, itemName: string) {
    setBusy(true);
    setError(null);
    try {
      await post(`/api/cafes/${cafe.id}/treats/${treatId}/redeem`);
      setDone({ kind: "treat", item: itemName });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-1 flex-col items-center pt-10 text-center">
        <div className="text-5xl">☕</div>
        <h1 className="mt-4 font-serif text-3xl">Enjoy your {done.item.toLowerCase()}.</h1>
        {done.kind === "other" ? (
          <>
            <p className="mt-3 max-w-xs text-ink-soft">
              Paid at the counter, so no circle this time. Pay with PayPal next time to meet the people who buy here.
            </p>
            <button onClick={() => setDone(null)} className="mt-8 rounded-full border border-line px-5 py-2.5 text-sm">
              Back to checkout
            </button>
          </>
        ) : (
          <>
            <p className="mt-3 max-w-xs text-ink-soft">
              {done.kind === "treat" ? "Your coffee was a treat, and it was paid with PayPal, so " : ""}
              you&apos;re in <b>{cafe.name}</b>&apos;s circle for the next 7 days.
            </p>
            <Link href={`/cafes/${cafe.id}`} className="mt-8 rounded-full bg-ink px-6 py-3 font-semibold text-bg">
              Meet the circle
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-ink-soft">Checkout</p>
      <h1 className="font-serif text-3xl">{cafe.name}</h1>

      {treats.length > 0 && (
        <div className="mt-5 space-y-3">
          {treats.map((t) => (
            <div key={t.id} className="rounded-3xl bg-accent-soft p-5">
              <p className="text-xs uppercase tracking-wider text-accent">A coffee is waiting for you</p>
              <p className="mt-1 font-serif text-xl">
                {t.itemName}, on {t.from}
              </p>
              <p className="text-sm text-ink-soft">
                Planned for {t.meetLabel} · {usd(t.amountCents)} held in {t.from}&apos;s PayPal
              </p>
              <button
                disabled={busy}
                onClick={() => redeem(t.id, t.itemName)}
                className="mt-4 w-full rounded-full bg-ink px-5 py-3 text-sm font-semibold text-bg disabled:opacity-50"
              >
                {busy ? "Picking up…" : "Pick it up"}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-3xl border border-line bg-surface">
        {cafe.menu.map((m) => (
          <label
            key={m.id}
            className={`flex cursor-pointer items-center justify-between border-b border-line px-5 py-3.5 last:border-b-0 ${
              m.id === itemId ? "bg-surface-2" : ""
            }`}
          >
            <span className="flex items-center gap-3">
              <input type="radio" name="item" checked={m.id === itemId} onChange={() => setItemId(m.id)} />
              {m.name}
            </span>
            <span className="tabular-nums text-ink-soft">{usd(m.priceCents)}</span>
          </label>
        ))}
      </div>

      <div className="mt-4 flex items-baseline justify-between px-1">
        <span className="text-ink-soft">Total</span>
        <span className="font-serif text-2xl tabular-nums">{usd(item.priceCents)}</span>
      </div>

      {cafe.acceptsPaypal ? (
        <div className="mt-5">
          <p className="mb-2 text-center text-sm text-accent">
            {inCircle ? "Paying with PayPal renews your 7 days in this circle." : "Pay with PayPal to join this café's circle for 7 days."}
          </p>
          <PayPalShell>
            <PayPalButton
              key={itemId}
              type="pay"
              presentationMode="auto"
              createOrder={async () => {
                setError(null);
                const { orderId } = await post(`/api/cafes/${cafe.id}/orders`, { itemId });
                return { orderId };
              }}
              onApprove={async ({ orderId }) => {
                try {
                  await post(`/api/cafes/${cafe.id}/orders/${orderId}/capture`, { itemId });
                  setDone({ kind: "paypal", item: item.name });
                  router.refresh();
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                }
              }}
              onCancel={() => setError("Payment cancelled.")}
              onError={(e) => setError(e instanceof Error ? e.message : "PayPal error")}
            />
          </PayPalShell>
        </div>
      ) : (
        <p className="mt-5 rounded-xl bg-surface-2 p-3 text-center text-sm text-ink-soft">
          This café doesn&apos;t take PayPal, so there&apos;s no circle here.
        </p>
      )}

      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await post(`/api/cafes/${cafe.id}/pay-other`, { itemId });
            setDone({ kind: "other", item: item.name });
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
          } finally {
            setBusy(false);
          }
        }}
        className="mt-3 w-full rounded-full border border-line px-5 py-3 text-sm text-ink-soft hover:text-ink"
      >
        Pay another way (card or cash at the counter)
      </button>

      {error && <p className="mt-4 rounded-xl bg-surface-2 p-3 text-sm text-warn">{error}</p>}
    </div>
  );
}
