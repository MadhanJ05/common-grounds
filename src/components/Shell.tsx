import Link from "next/link";

export function Brand({ small = false }: { small?: boolean }) {
  return (
    <span className={`font-serif tracking-tight ${small ? "text-lg" : "text-2xl"}`}>
      <span aria-hidden className="mr-1.5">☕</span>Common Grounds
    </span>
  );
}

export function Shell({
  children,
  active,
  back,
}: {
  children: React.ReactNode;
  active?: "home" | "map" | "me";
  back?: { href: string; label: string };
}) {
  const tab = (key: "home" | "map" | "me", href: string, label: string) => (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-sm transition ${
        active === key ? "bg-ink text-bg" : "text-ink-soft hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-16">
      <header className="sticky top-0 z-[1000] -mx-4 flex items-center justify-between gap-2 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur">
        {back ? (
          <Link href={back.href} className="text-sm text-ink-soft hover:text-ink">
            ← {back.label}
          </Link>
        ) : (
          <Link href="/home">
            <Brand small />
          </Link>
        )}
        <nav className="flex items-center gap-1">
          {tab("home", "/home", "Home")}
          {tab("map", "/map", "Map")}
          {tab("me", "/me", "Me")}
        </nav>
      </header>
      <main className="flex flex-1 flex-col pt-5">{children}</main>
    </div>
  );
}

export function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="mb-3 mt-7 flex items-baseline justify-between first:mt-0">
      <h2 className="font-serif text-xl">{children}</h2>
      {hint && <span className="text-xs text-ink-soft">{hint}</span>}
    </div>
  );
}
