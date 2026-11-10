"use client";

import { useActionState, useState } from "react";
import { saveCard, type CardFormState } from "@/app/onboarding/actions";
import { PersonCard } from "@/components/PersonCard";

type Initial = {
  nickname: string;
  realName: string | null;
  showRealName: boolean;
  promptInto: string;
  promptAsk: string;
  promptMeet: string;
  birthdate: string | null;
  ageVerified: boolean;
  ageMin: number;
  ageMax: number;
  onlyVerified: boolean;
};

export function CardForm({ initial, from }: { initial: Initial; from: "onboarding" | "me" }) {
  const [state, action, pending] = useActionState<CardFormState, FormData>(saveCard, {});
  const [v, setV] = useState(initial);
  const set = <K extends keyof Initial>(k: K) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV({ ...v, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const field = "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] outline-none focus:border-accent";
  const label = "mb-1.5 block text-sm font-medium";
  const displayName = v.showRealName && v.realName ? v.realName.split(" ")[0] : v.nickname || "Your nickname";

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="from" value={from} />

      <div>
        <label className={label} htmlFor="nickname">
          Nickname
        </label>
        <input id="nickname" name="nickname" className={field} maxLength={24} value={v.nickname} onChange={set("nickname")} placeholder="e.g. Quiet Fox" />
        {v.realName && (
          <label className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" name="showRealName" checked={v.showRealName} onChange={set("showRealName")} />
            Show my first name ({v.realName.split(" ")[0]}) instead
          </label>
        )}
      </div>

      {(
        [
          ["promptInto", "Lately I'm into…", "e.g. film photography and thrift-store cameras"],
          ["promptAsk", "Ask me about…", "e.g. the best sunset spot near campus"],
          ["promptMeet", "I'd love to meet someone who…", "e.g. is also learning to develop film"],
        ] as const
      ).map(([k, l, ph]) => (
        <div key={k}>
          <label className={label} htmlFor={k}>
            {l}
          </label>
          <input id={k} name={k} className={field} maxLength={140} value={v[k]} onChange={set(k)} placeholder={ph} />
        </div>
      ))}

      <fieldset className="rounded-2xl border border-line p-4">
        <legend className="px-1 text-sm font-medium">Age</legend>
        {v.ageVerified ? (
          <p className="text-sm text-ok">Your age is verified by PayPal. It&apos;s used for filtering only and never shown.</p>
        ) : (
          <div>
            <label className={label} htmlFor="birthdate">
              Date of birth
            </label>
            <input id="birthdate" name="birthdate" type="date" className={field} value={v.birthdate ?? ""} onChange={set("birthdate")} />
            <p className="mt-1.5 text-xs text-warn">
              Because PayPal didn&apos;t share it, your card will say <b>Unverified</b>.
            </p>
          </div>
        )}
        <div className="mt-4">
          <p className={label}>I&apos;m open to meeting people aged</p>
          <div className="flex items-center gap-2">
            <input name="ageMin" type="number" min={18} max={99} className={`${field} w-24`} value={v.ageMin} onChange={set("ageMin")} />
            <span className="text-ink-soft">to</span>
            <input name="ageMax" type="number" min={18} max={99} className={`${field} w-24`} value={v.ageMax} onChange={set("ageMax")} />
          </div>
          <p className="mt-1.5 text-xs text-ink-soft">
            It works both ways: you only see someone if each of you is in the other&apos;s range.
          </p>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" name="onlyVerified" checked={v.onlyVerified} onChange={set("onlyVerified")} />
          Only show me people whose age PayPal verified
        </label>
      </fieldset>

      <div>
        <p className="mb-2 text-sm font-medium">How people will see you</p>
        <PersonCard
          person={{
            displayName,
            promptInto: v.promptInto || "…",
            promptAsk: v.promptAsk || "…",
            promptMeet: v.promptMeet || "…",
            ageVerified: v.ageVerified,
          }}
        />
      </div>

      {state.error && <p className="rounded-xl bg-surface-2 p-3 text-sm text-warn">{state.error}</p>}
      {state.saved && <p className="rounded-xl bg-ok-soft p-3 text-sm text-ok">Saved.</p>}

      <button
        disabled={pending}
        className="w-full rounded-full bg-ink px-6 py-3.5 font-semibold text-bg transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Saving…" : from === "onboarding" ? "Save my card" : "Save changes"}
      </button>
      <p className="text-center text-xs text-ink-soft">
        Claude reads your chats only to spot coffee plans and set up a treat. It never writes messages for you.
      </p>
    </form>
  );
}
