export type CardPerson = {
  displayName: string;
  promptInto: string;
  promptAsk: string;
  promptMeet: string;
  ageVerified: boolean;
};

export function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="rounded-full bg-ok-soft px-2 py-0.5 text-[11px] font-medium text-ok">Age verified by PayPal</span>
  ) : (
    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-warn">Unverified</span>
  );
}

export function PersonCard({ person, footer }: { person: CardPerson; footer?: React.ReactNode }) {
  const prompt = (label: string, text: string) => (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-ink-soft">{label}</p>
      <p className="mt-0.5 font-serif text-[17px] leading-snug">{text}</p>
    </div>
  );
  return (
    <article className="rounded-3xl border border-line bg-surface p-5 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{person.displayName}</h3>
        <VerifiedBadge verified={person.ageVerified} />
      </div>
      <div className="space-y-3.5">
        {prompt("Lately I'm into", person.promptInto)}
        {prompt("Ask me about", person.promptAsk)}
        {prompt("I'd love to meet someone who", person.promptMeet)}
      </div>
      {footer && <div className="mt-5">{footer}</div>}
    </article>
  );
}
