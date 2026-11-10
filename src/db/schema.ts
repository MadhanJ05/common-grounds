import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/** A person with a reusable card. Real name and birthdate are private. */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Stable id from Log in with PayPal (`user_id` claim). Null for seeded demo people. */
    paypalUserId: text("paypal_user_id"),
    email: text("email"),
    realName: text("real_name"),
    nickname: text("nickname"),
    showRealName: boolean("show_real_name").notNull().default(false),
    /** "Lately I'm into…" */
    promptInto: text("prompt_into"),
    /** "Ask me about…" */
    promptAsk: text("prompt_ask"),
    /** "I'd love to meet someone who…" */
    promptMeet: text("prompt_meet"),
    birthdate: date("birthdate"),
    /** True only when the birthdate came from PayPal. */
    ageVerified: boolean("age_verified").notNull().default(false),
    ageMin: integer("age_min").notNull().default(18),
    ageMax: integer("age_max").notNull().default(99),
    onlyVerified: boolean("only_verified").notNull().default(false),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_paypal_user_id_idx").on(t.paypalUserId)],
);

export type MenuItem = { id: string; name: string; priceCents: number };

/** A café that takes PayPal. Each café has its own circle. */
export const cafes = pgTable("cafes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  neighborhood: text("neighborhood").notNull(),
  /** Free-text hints people use for this place ("the one on Huntington", "by the library"). */
  aliases: text("aliases").notNull().default(""),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  acceptsPaypal: boolean("accepts_paypal").notNull().default(true),
  menu: jsonb("menu").$type<MenuItem[]>().notNull(),
  /** Opening hours as a short human string, shown to the AI and in the UI. */
  hours: text("hours").notNull().default("7am–7pm"),
});

/** A purchase at a café. A PayPal purchase opens that café's circle for 7 days. */
export const visits = pgTable(
  "visits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    cafeId: text("cafe_id")
      .notNull()
      .references(() => cafes.id),
    /** "paypal" opens the circle; "other" (card/cash at the counter) does not. "treat" = redeemed coffee someone paid for with PayPal. */
    method: text("method", { enum: ["paypal", "other", "treat"] }).notNull(),
    itemName: text("item_name").notNull(),
    amountCents: integer("amount_cents").notNull(),
    paypalOrderId: text("paypal_order_id"),
    paypalCaptureId: text("paypal_capture_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("visits_user_cafe_idx").on(t.userId, t.cafeId, t.createdAt)],
);

/** A one-way "say hi". Two hellos in opposite directions make a connection. */
export const hellos = pgTable(
  "hellos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromUserId: uuid("from_user_id")
      .notNull()
      .references(() => users.id),
    toUserId: uuid("to_user_id")
      .notNull()
      .references(() => users.id),
    cafeId: text("cafe_id")
      .notNull()
      .references(() => cafes.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("hellos_pair_idx").on(t.fromUserId, t.toUserId)],
);

/** A mutual connection. userA < userB (by uuid string) so each pair appears once. */
export const connections = pgTable(
  "connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userA: uuid("user_a")
      .notNull()
      .references(() => users.id),
    userB: uuid("user_b")
      .notNull()
      .references(() => users.id),
    cafeId: text("cafe_id")
      .notNull()
      .references(() => cafes.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("connections_pair_idx").on(t.userA, t.userB)],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => connections.id),
    /** Null for system notes (e.g. treat updates). */
    senderId: uuid("sender_id").references(() => users.id),
    body: text("body").notNull(),
    kind: text("kind", { enum: ["text", "system"] })
      .notNull()
      .default("text"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("messages_connection_idx").on(t.connectionId, t.createdAt)],
);

export const TREAT_STATUSES = [
  /** Claude spotted a plan and prepared a PayPal order; nobody has approved it yet. */
  "suggested",
  /** The treater approved in PayPal; the money is authorized (held), not captured. */
  "held",
  /** The recipient accepted. Still only held. */
  "accepted",
  /** Captured at the café when the recipient picked up the coffee. */
  "redeemed",
  /** Recipient declined; authorization voided. */
  "declined",
  /** Not redeemed in time; authorization voided. */
  "expired",
  /** The suggestion was dismissed before anyone paid. */
  "dismissed",
] as const;
export type TreatStatus = (typeof TREAT_STATUSES)[number];

/** "Coffee's on me": a coffee one person pays for and the other picks up. */
export const treats = pgTable(
  "treats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => connections.id),
    cafeId: text("cafe_id")
      .notNull()
      .references(() => cafes.id),
    itemId: text("item_id").notNull(),
    itemName: text("item_name").notNull(),
    amountCents: integer("amount_cents").notNull(),
    /** When they plan to meet, as Claude resolved it. */
    meetAt: timestamp("meet_at", { withTimezone: true }).notNull(),
    /** Human label, e.g. "Tue · 10:50 AM". */
    meetLabel: text("meet_label").notNull(),
    /** The words in the chat Claude based this on. */
    planQuote: text("plan_quote").notNull(),
    /** One short line from Claude on how it read the plan (shown on tap, for transparency). */
    reading: text("reading").notNull(),
    status: text("status", { enum: TREAT_STATUSES }).notNull().default("suggested"),
    /** Set once someone approves in PayPal. */
    fromUserId: uuid("from_user_id").references(() => users.id),
    toUserId: uuid("to_user_id").references(() => users.id),
    paypalOrderId: text("paypal_order_id"),
    paypalOrderCreatedAt: timestamp("paypal_order_created_at", { withTimezone: true }),
    paypalAuthorizationId: text("paypal_authorization_id"),
    paypalCaptureId: text("paypal_capture_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("treats_connection_idx").on(t.connectionId)],
);

export type User = typeof users.$inferSelect;
export type Cafe = typeof cafes.$inferSelect;
export type Visit = typeof visits.$inferSelect;
export type Connection = typeof connections.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Treat = typeof treats.$inferSelect;
