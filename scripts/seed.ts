/**
 * Seeds fictional cafés and fictional people so circles aren't empty in the demo.
 * Every café and person here is made up. Safe to re-run: it upserts by fixed ids.
 *
 *   pnpm db:seed
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, inArray } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "../src/db/schema";
import { cafes, users, visits, type MenuItem } from "../src/db/schema";

const url = process.env.DATABASE_URL ?? "postgres://localhost:5432/common_grounds";
const client = postgres(url, { max: 1, ssl: url.includes(".render.com") ? "require" : false });
const db = drizzle(client, { schema });

const menu = (latte: number, extra: MenuItem[] = []): MenuItem[] => [
  { id: "drip", name: "Drip coffee", priceCents: 325 },
  { id: "latte", name: "Latte", priceCents: latte },
  { id: "cold-brew", name: "Cold brew", priceCents: 450 },
  { id: "chai", name: "Chai latte", priceCents: 495 },
  ...extra,
];

// Fictional cafés around Northeastern / Back Bay / Kendall.
const CAFES: (typeof cafes.$inferInsert)[] = [
  {
    id: "ember-and-oat",
    name: "Ember & Oat",
    address: "301 Huntington Ave, Boston",
    neighborhood: "Huntington / Symphony",
    aliases: "the one on Huntington; by Symphony Hall; near campus; ember",
    lat: 42.3418,
    lng: -71.0861,
    menu: menu(475, [{ id: "cortado", name: "Cortado", priceCents: 425 }]),
    hours: "7am–8pm",
  },
  {
    id: "slow-pour",
    name: "Slow Pour",
    address: "1260 Boylston St, Boston",
    neighborhood: "Fenway",
    aliases: "the place by Fenway; on Boylston; slow pour",
    lat: 42.3455,
    lng: -71.0968,
    menu: menu(495, [{ id: "pour-over", name: "Pour-over", priceCents: 550 }]),
    hours: "7am–6pm",
  },
  {
    id: "library-steps",
    name: "Library Steps",
    address: "12 Copley Square, Boston",
    neighborhood: "Copley",
    aliases: "by the library; Copley; library steps",
    lat: 42.3497,
    lng: -71.0779,
    menu: menu(500),
    hours: "6:30am–7pm",
  },
  {
    id: "commons-roasters",
    name: "Commons Roasters",
    address: "240 Newbury St, Boston",
    neighborhood: "Back Bay",
    aliases: "on Newbury; commons; the roastery",
    lat: 42.3489,
    lng: -71.0838,
    menu: menu(525, [{ id: "flat-white", name: "Flat white", priceCents: 500 }]),
    hours: "8am–7pm",
  },
  {
    id: "main-street-grind",
    name: "Main Street Grind",
    address: "350 Main St, Cambridge",
    neighborhood: "Kendall Square",
    aliases: "the place on Main; Kendall; main st grind; across the river",
    lat: 42.3624,
    lng: -71.0868,
    menu: menu(485),
    hours: "7am–9pm",
  },
  {
    id: "rosebud-espresso",
    name: "Rosebud Espresso",
    address: "590 Tremont St, Boston",
    neighborhood: "South End",
    aliases: "on Tremont; rosebud; south end",
    lat: 42.3431,
    lng: -71.0716,
    menu: menu(465, [{ id: "espresso", name: "Espresso", priceCents: 300 }]),
    hours: "7am–5pm",
  },
  {
    id: "harbor-bean",
    name: "Harbor Bean",
    address: "88 Seaport Blvd, Boston",
    neighborhood: "Seaport",
    aliases: "seaport; by the water; harbor",
    lat: 42.3519,
    lng: -71.0446,
    menu: menu(550),
    hours: "7am–6pm",
    // A café that does NOT take PayPal: it never gets a circle and Claude won't set a treat up there.
    acceptsPaypal: false,
  },
];

const yearsAgo = (years: number, monthDay = "04-15") => `${new Date().getFullYear() - years}-${monthDay}`;

type Person = typeof users.$inferInsert & { id: string; cafesVisited: { cafe: string; hoursAgo: number }[] };

// Fictional people. "demo:" ids can be chosen on the demo sign-in screen.
const PEOPLE: Person[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    paypalUserId: "demo:sam",
    nickname: "Sam",
    realName: "Sam Rivera",
    promptInto: "building a tiny app that reminds my roommates whose turn it is to buy groceries",
    promptAsk: "why I switched from mechanical engineering to design",
    promptMeet: "likes testing half-finished apps and telling me honestly what's broken",
    birthdate: yearsAgo(22, "03-02"),
    ageVerified: true,
    ageMin: 19,
    ageMax: 28,
    cafesVisited: [],
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    paypalUserId: "demo:alex",
    nickname: "Alex",
    realName: "Alex Chen",
    promptInto: "breaking apps on purpose — I do QA for a campus startup",
    promptAsk: "the weirdest bug I've ever found",
    promptMeet: "is building something and wants a brutally honest first user",
    birthdate: yearsAgo(23, "07-19"),
    ageVerified: true,
    ageMin: 19,
    ageMax: 30,
    cafesVisited: [{ cafe: "ember-and-oat", hoursAgo: 20 }],
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    nickname: "Quiet Fox",
    promptInto: "film photography and cheap thrift-store cameras",
    promptAsk: "the best spot near campus to watch the sunset",
    promptMeet: "is also learning to develop film at home",
    birthdate: yearsAgo(21, "11-30"),
    ageVerified: true,
    ageMin: 18,
    ageMax: 26,
    isDemo: true,
    cafesVisited: [
      { cafe: "ember-and-oat", hoursAgo: 30 },
      { cafe: "commons-roasters", hoursAgo: 70 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    nickname: "Tess",
    promptInto: "bouldering — slowly getting less bad at it",
    promptAsk: "how I survived organic chem",
    promptMeet: "wants a regular study buddy for Thursday afternoons",
    birthdate: yearsAgo(20, "01-09"),
    ageVerified: true,
    ageMin: 18,
    ageMax: 25,
    isDemo: true,
    cafesVisited: [
      { cafe: "ember-and-oat", hoursAgo: 5 },
      { cafe: "commons-roasters", hoursAgo: 50 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000005",
    nickname: "Marlow",
    promptInto: "salsa nights and cooking for far too many people",
    promptAsk: "the best $6 lunch in Fenway",
    promptMeet: "wants a weekly language swap — I'm learning Portuguese",
    birthdate: yearsAgo(26, "05-21"),
    ageVerified: false,
    ageMin: 21,
    ageMax: 35,
    isDemo: true,
    cafesVisited: [
      { cafe: "slow-pour", hoursAgo: 12 },
      { cafe: "commons-roasters", hoursAgo: 90 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000006",
    nickname: "Paper Plane",
    promptInto: "late-night jazz and digging through used vinyl",
    promptAsk: "the record I'd save in a fire",
    promptMeet: "wants to go to a show and actually talk about it after",
    birthdate: yearsAgo(22, "09-14"),
    ageVerified: true,
    ageMin: 19,
    ageMax: 30,
    isDemo: true,
    cafesVisited: [
      { cafe: "slow-pour", hoursAgo: 40 },
      { cafe: "main-street-grind", hoursAgo: 8 },
      { cafe: "ember-and-oat", hoursAgo: 60 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000007",
    nickname: "North Star",
    promptInto: "running a small sourdough side-hustle out of my apartment",
    promptAsk: "my most spectacular bread failures",
    promptMeet: "is starting something too and wants a sounding board",
    birthdate: yearsAgo(31, "02-27"),
    ageVerified: true,
    ageMin: 24,
    ageMax: 40,
    isDemo: true,
    cafesVisited: [
      { cafe: "library-steps", hoursAgo: 26 },
      { cafe: "main-street-grind", hoursAgo: 3 },
      { cafe: "ember-and-oat", hoursAgo: 15 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000008",
    nickname: "Juniper",
    promptInto: "learning to make games in Godot",
    promptAsk: "the game I've been 'almost finished' with for a year",
    promptMeet: "wants to playtest each other's projects",
    birthdate: yearsAgo(24, "08-08"),
    ageVerified: true,
    ageMin: 20,
    ageMax: 30,
    isDemo: true,
    cafesVisited: [
      { cafe: "library-steps", hoursAgo: 6 },
      { cafe: "ember-and-oat", hoursAgo: 44 },
    ],
  },
  {
    // Older person: with a 19–28 range, Sam never sees them, and they never see Sam.
    id: "00000000-0000-4000-8000-000000000009",
    nickname: "Gray Owl",
    promptInto: "birdwatching along the Charles",
    promptAsk: "forty years of Red Sox heartbreak",
    promptMeet: "knows the Fens' birds better than I do",
    birthdate: yearsAgo(54, "06-03"),
    ageVerified: true,
    ageMin: 40,
    ageMax: 70,
    isDemo: true,
    cafesVisited: [
      { cafe: "ember-and-oat", hoursAgo: 9 },
      { cafe: "rosebud-espresso", hoursAgo: 36 },
    ],
  },
];

async function main() {
  for (const c of CAFES) {
    await db.insert(cafes).values(c).onConflictDoUpdate({ target: cafes.id, set: c });
  }

  const ids = PEOPLE.map((p) => p.id);
  // Reset the seeded people's purchases so the "hours ago" stay fresh on every seed.
  await db.delete(visits).where(inArray(visits.userId, ids));

  for (const { cafesVisited, ...p } of PEOPLE) {
    await db.insert(users).values(p).onConflictDoUpdate({ target: users.id, set: p });
    for (const v of cafesVisited) {
      const cafe = CAFES.find((c) => c.id === v.cafe)!;
      const item = (cafe.menu as MenuItem[])[1];
      await db.insert(visits).values({
        userId: p.id,
        cafeId: v.cafe,
        method: "paypal",
        itemName: item.name,
        amountCents: item.priceCents,
        createdAt: new Date(Date.now() - v.hoursAgo * 3600_000),
      });
    }
  }

  const [{ count }] = await client`select count(*)::int as count from users`;
  const sam = await db.select().from(users).where(eq(users.id, PEOPLE[0].id));
  console.log(`Seeded ${CAFES.length} cafés and ${PEOPLE.length} people (users total: ${count}). Sam: ${sam[0]?.nickname}`);
  await client.end();
}

main().catch(async (e) => {
  console.error(e);
  await client.end();
  process.exit(1);
});
