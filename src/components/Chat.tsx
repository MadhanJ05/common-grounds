"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PayPalShell } from "@/components/PayPalShell";
import { TreatCard, type TreatView } from "@/components/TreatCard";

type Msg = { id: string; body: string; kind: "text" | "system"; mine: boolean; createdAt: string };
type Item = { at: number; key: string } & ({ type: "msg"; msg: Msg } | { type: "treat"; treat: TreatView });

const POLL_MS = 2500;

export function Chat({
  connectionId,
  otherName,
  cafes,
}: {
  connectionId: string;
  otherName: string;
  cafes: Record<string, string>;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [treats, setTreats] = useState<TreatView[]>([]);
  const [cafeNames, setCafeNames] = useState(cafes);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [watching, setWatching] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);

  const load = useCallback(async () => {
    const res = await fetch(`/api/chats/${connectionId}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setMsgs(data.messages);
    setTreats(data.treats);
    const missing = (data.treats as TreatView[]).map((t) => t.cafeId).filter((id) => !(id in cafeNames));
    if (missing.length) {
      const r = await fetch(`/api/cafes-lookup?ids=${missing.join(",")}`);
      if (r.ok) {
        const extra: Record<string, string> = await r.json();
        setCafeNames((prev) => ({ ...prev, ...extra }));
      }
    }
  }, [connectionId, cafeNames]);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  // Claude reads in the background for a few seconds after each message; show a quiet hint meanwhile.
  useEffect(() => {
    if (!watching) return;
    const t = setTimeout(() => setWatching(false), 12_000);
    return () => clearTimeout(t);
  }, [watching]);

  const items: Item[] = [
    ...msgs.map((m) => ({ type: "msg" as const, msg: m, at: new Date(m.createdAt).getTime(), key: `m${m.id}` })),
    ...treats.map((t) => ({ type: "treat" as const, treat: t, at: new Date(t.createdAt).getTime(), key: `t${t.id}` })),
  ].sort((a, b) => a.at - b.at);

  useEffect(() => {
    if (items.length !== lastCount.current) {
      lastCount.current = items.length;
      bottom.current?.scrollIntoView({ behavior: "smooth" });
    }
  });

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    setText("");
    await fetch(`/api/chats/${connectionId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setSending(false);
    setWatching(true);
    load();
  }

  return (
    <PayPalShell>
      <div className="flex flex-1 flex-col">
        <div className="flex-1 space-y-2 pb-4">
          {items.length === 0 && (
            <p className="py-10 text-center text-sm text-ink-soft">
              You and {otherName} both said hi. Start with something from their card.
            </p>
          )}
          {items.map((it) =>
            it.type === "treat" ? (
              <TreatCard
                key={it.key}
                treat={it.treat}
                cafeName={cafeNames[it.treat.cafeId] ?? "the café"}
                otherName={otherName}
                onChange={load}
              />
            ) : it.msg.kind === "system" ? (
              <p key={it.key} className="px-6 py-1 text-center text-xs leading-relaxed text-ink-soft">
                {it.msg.body}
              </p>
            ) : (
              <div key={it.key} className={`flex ${it.msg.mine ? "justify-end" : "justify-start"}`}>
                <p
                  className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-[15px] leading-snug ${
                    it.msg.mine ? "rounded-br-md bg-ink text-bg" : "rounded-bl-md border border-line bg-surface"
                  }`}
                >
                  {it.msg.body}
                </p>
              </div>
            ),
          )}
          {watching && (
            <p className="text-center text-[11px] text-ink-soft opacity-70">
              ✦ Claude is checking whether that&apos;s a coffee plan…
            </p>
          )}
          <div ref={bottom} />
        </div>

        <form onSubmit={send} className="sticky bottom-0 -mx-4 flex gap-2 border-t border-line bg-bg px-4 py-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Message ${otherName}`}
            className="flex-1 rounded-full border border-line bg-surface px-4 py-2.5 text-[15px] outline-none focus:border-accent"
          />
          <button
            disabled={sending || !text.trim()}
            className="rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-bg disabled:opacity-40"
          >
            Send
          </button>
        </form>
        <p className="pb-2 text-center text-[11px] text-ink-soft">
          <Link href="/me" className="underline-offset-2 hover:underline">
            Claude reads chats only to spot coffee plans.
          </Link>
        </p>
      </div>
    </PayPalShell>
  );
}
