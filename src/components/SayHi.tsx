"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SayHi({
  toUserId,
  cafeId,
  name,
  initial,
  connectionId,
}: {
  toUserId: string;
  cafeId: string;
  name: string;
  initial: "sent" | "received" | null;
  connectionId: string | null;
}) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [passed, setPassed] = useState(false);

  if (connectionId) {
    return (
      <button
        onClick={() => router.push(`/chats/${connectionId}`)}
        className="w-full rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-bg"
      >
        Open chat
      </button>
    );
  }
  if (passed) return <p className="text-center text-sm text-ink-soft">Passed. {name} won&apos;t know.</p>;
  if (state === "sent") return <p className="text-center text-sm text-ink-soft">You said hi. If {name} says hi back, a chat opens.</p>;

  async function hi() {
    setBusy(true);
    const res = await fetch("/api/hello", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUserId, cafeId }),
    });
    setBusy(false);
    if (!res.ok) return;
    const { connectionId } = await res.json();
    if (connectionId) router.push(`/chats/${connectionId}`);
    else setState("sent");
  }

  return (
    <div className="space-y-2">
      {state === "received" && <p className="text-center text-sm text-accent">{name} said hi to you.</p>}
      <div className="flex gap-2">
        <button
          onClick={() => setPassed(true)}
          className="flex-1 rounded-full border border-line px-5 py-2.5 text-sm text-ink-soft hover:text-ink"
        >
          Pass
        </button>
        <button
          disabled={busy}
          onClick={hi}
          className="flex-[2] rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-bg disabled:opacity-50"
        >
          {state === "received" ? "Say hi back" : "Say hi"}
        </button>
      </div>
    </div>
  );
}
