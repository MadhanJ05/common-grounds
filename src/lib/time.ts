/** All cafés in the demo are in Boston; plans are read in this timezone. */
export const TZ = "America/New_York";

function partsIn(date: Date, tz: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  return {
    y: Number(p.year),
    mo: Number(p.month),
    d: Number(p.day),
    h: Number(p.hour),
    mi: Number(p.minute),
    s: Number(p.second),
  };
}

function offsetMs(date: Date, tz: string) {
  const p = partsIn(date, tz);
  return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - date.getTime();
}

/** "2026-11-10T10:50" in the café's timezone → a real instant. Returns null if malformed. */
export function localToInstant(local: string, tz = TZ): Date | null {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let instant = guess - offsetMs(new Date(guess), tz);
  // Second pass fixes the hour around DST changes.
  instant = guess - offsetMs(new Date(instant), tz);
  return new Date(instant);
}

/** "Tue · 10:50 AM" */
export function meetLabel(date: Date, tz = TZ) {
  const day = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(date);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(date);
  return `${day} · ${time}`;
}

/** "Monday, November 9, 2026 at 10:42 PM" */
export function longNow(date = new Date(), tz = TZ) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/** "Mon 10:42 PM" for chat transcripts given to the model. */
export function shortStamp(date: Date, tz = TZ) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/** Opening hours like "7am–8pm" or "6:30am–7pm" → minutes since midnight. */
export function parseHours(hours: string): { open: number; close: number } | null {
  const m = hours.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*[–-]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (!m) return null;
  const toMin = (h: string, mi: string | undefined, ap: string) =>
    ((Number(h) % 12) + (ap.toLowerCase() === "pm" ? 12 : 0)) * 60 + Number(mi ?? 0);
  return { open: toMin(m[1], m[2], m[3]), close: toMin(m[4], m[5], m[6]) };
}

export function minutesSinceMidnight(date: Date, tz = TZ) {
  const p = partsIn(date, tz);
  return p.h * 60 + p.mi;
}
