# Common Grounds ☕

**Grab a coffee to meet someone.**

Pay for your coffee with PayPal and you join that café's *circle*: the other people who bought there this week. Pay any other way and you just get coffee. When two people in a circle make a plan to meet, Claude reads the plan in their chat ("tmrw after my 10am, the place on Main?") and sets up a PayPal hold so one of them can treat the other. The hold is captured only when the coffee is picked up.

> Built for the PayPal AI Hackathon (Nov 2026). Everything runs on the **PayPal sandbox**, so no real money moves.

**Live demo:** https://common-grounds.onrender.com · **Video:** _link added after recording_

---

## Why it exists

Social apps for meeting new people struggle with the same thing: there's no reason to show up, and nothing in common to start from. Common Grounds flips that around:

- **The reason to show up is coffee you were buying anyway.** A PayPal purchase *is* the ticket, so there's no extra fee or subscription.
- **The shared context is the place.** People in a circle all bought at the same café this week, morning people and afternoon people alike, without having to be there at the same time.
- **Each side gets something:** customers meet people around places they already go, cafés get a reason for customers to come back (every PayPal coffee renews the circle for 7 days), and PayPal gets a reason to be chosen at checkout.

## What you can do

| | |
|---|---|
| **Join a circle** | Buy a coffee with PayPal at any participating café. A verified, completed PayPal capture opens that café's circle for 7 days. Buying again renews it. |
| **See a few cards** | Each person has one reusable card: a nickname and three prompts ("Lately I'm into…", "Ask me about…", "I'd love to meet someone who…"). No photos, no swiping, and no age shown. |
| **Mutual age filter** | You only see someone if each of you falls inside the other's chosen age range. Age comes from PayPal (Log in with PayPal `birthdate`) when available, and otherwise the card shows **Unverified**. Anyone can choose to see only verified people. |
| **Quiet hello** | Say hi or pass. A chat opens only when both people say hi. Passing is never recorded. |
| **Coffee's on me (AI + PayPal)** | Claude spots a settled plan in the chat and prepares a PayPal **AUTHORIZE** order for one coffee at the right café and time. One tap in PayPal places a **hold**. The recipient accepts or declines. Picking it up at the café's checkout **captures** the hold (and opens that café's circle for them). A decline or no-show **voids** it, so there's no charge. |
| **Where to next** | A map of nearby cafés that take PayPal, each with its own circle (a concept for a tab inside the PayPal app). |

## How AI is used (Claude)

The AI isn't a chatbot and never writes messages for anyone. It's an agent with a narrow job and real tools.

- **Model:** `claude-opus-5-5` through the official Anthropic TypeScript SDK (tool runner), with server-side refusal fallback enabled.
- **When it runs:** after each chat message, in the background (Next.js `after()`), at most once at a time per chat.
- **What it decides:** whether the conversation now contains a *settled* plan. A proposal followed by agreement counts; "we should get coffee sometime" doesn't. Tested behavior: it waits on "tmrw after my 10am? the place on Main" until the other person replies "perfect, see you there".
- **What it resolves:** relative times against the current Boston time ("tmrw after my 10am" becomes Wed 11:00 AM), loose place references through a café lookup tool ("the place on Main" becomes Main Street Grind), the drink from the menu, the café's hours, and whether the café takes PayPal.
- **Tools** (`src/lib/plan-agent.ts`):
  - `find_cafe(hint)`: fuzzy lookup in the café directory.
  - `set_up_treat(...)`: validates the plan, then creates the PayPal Orders v2 `AUTHORIZE` order.
  - `update_treat(...)`: rebuilds the order when people change the plan.
  - `dismiss_treat(...)`: withdraws a suggestion when the plan is called off.
- **Guardrails:**
  - Claude can only *prepare* a payment. A person must approve it in PayPal, and even then it's a hold until pickup.
  - Chat text is treated as data, not instructions.
  - Runs are capped per chat and per day to bound cost.
  - Every run logs its real token usage and cost.
- **Measured cost:** about $0.01 per ordinary message, and about $0.04 when it sets up a treat (3 tool turns).
- **Transparency:** each treat card has a "how Claude read it" link that shows the quoted words and Claude's one-line reading.

## How PayPal is used

| Flow | PayPal APIs |
|---|---|
| Café purchase opens a circle | JS SDK v6 (`@paypal/react-paypal-js/sdk-v6`), Orders v2 `CAPTURE`. The server checks the order's `reference_id` (café), `custom_id` (buyer) and amount before capturing. |
| Coffee's on me | Orders v2 `AUTHORIZE`, then `/v2/checkout/orders/{id}/authorize` (hold), `/v2/payments/authorizations/{id}/capture` (pickup), and `/v2/payments/authorizations/{id}/void` (decline or no-show) |
| Sign in and verified age | Log in with PayPal (OAuth code flow plus `userinfo`, using `birthdate` when shared) |

PayPal's Agent Toolkit was considered, but it has no authorize, capture or void actions. That's why Claude gets its own small tools that call the Orders and Payments APIs directly.

## Try it

### Hosted demo (judges)
1. Open the live demo link above.
2. Click **Continue as Sam**. Then open a private window and click **Continue as Alex**, so you can chat with yourself.
3. As Sam: **Map → Main Street Grind → Go to checkout → PayPal**. Log in with the sandbox buyer below. You're now in that café's circle.
4. Say hi to Alex (Alex is already in Ember & Oat's circle; Sam can join it the same way). Once both say hi, a chat opens.
5. Chat like a person ("coffee tmrw after my 10am? the place on Main" / "perfect"). In a few seconds a **Coffee's on me** card appears. Tap PayPal to treat (a hold), then as Alex: **Accept → Go to checkout → Pick it up** (a capture).

**PayPal sandbox buyer:** _email and password added before submission_. This is PayPal's test buyer with fake money. Don't use a real PayPal account.

The other sample people (Quiet Fox, Tess, Juniper and so on) are fictional. They say hi back automatically, so you can reach a chat alone.

### Run it locally
Requirements: Node 22+, pnpm, PostgreSQL.

```bash
git clone https://github.com/MadhanJ05/common-grounds.git
cd common-grounds
pnpm install
createdb common_grounds
cp .env.example .env.local     # then fill in the PayPal sandbox app and Anthropic key
pnpm db:migrate && pnpm db:seed
pnpm dev                       # http://localhost:3000
```

`.env.local` needs:
- `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`, from a sandbox app at developer.paypal.com
- `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, the same Client ID
- `ANTHROPIC_API_KEY`
- `SESSION_SECRET`, any long random string

For Log in with PayPal, add `<APP_URL>/api/auth/paypal/callback` as the app's return URL.

### Deploy
`render.yaml` is a Render Blueprint (a Node web service plus Postgres). Migrations and seed data run before each deploy.

## Tech

Next.js 16 (App Router, TypeScript) · Tailwind CSS 4 · PostgreSQL + Drizzle ORM · Anthropic TypeScript SDK · PayPal JS SDK v6 + REST APIs · Leaflet + OpenStreetMap · Hosted on Render

```
src/lib/plan-agent.ts   Claude agent: plan detection, tools, spend guard, cost logging
src/lib/treats.ts       Treat lifecycle: order, hold, accept/decline, capture, void, expiry
src/lib/circle.ts       7-day circles, mutual age filter, hellos, connections
src/lib/paypal.ts       PayPal REST client (Orders, Payments, Log in with PayPal)
src/app/api/…           Route handlers for checkout, treats, chat, hello, auth
scripts/seed.ts         Fictional cafés and people for the demo
```

## Privacy and safety

- No photos, and age is never shown. Age is used only for the mutual filter.
- Real names stay private unless you choose to show your first name.
- Circles never show who is at a café right now, only who bought there this week.
- Claude reads chats only to spot coffee plans, and the app says so on the card screen and in the chat.

## Honest limits

- The café checkout is simulated by this app's own screen. A real rollout would need each café's point-of-sale to integrate with PayPal, plus per-café merchant accounts. Here, one sandbox merchant stands in for all cafés.
- All cafés and people in the demo are fictional.
- Demand is untested: we haven't shown yet that people will switch payment method or visit more often for this.

## License

[MIT](LICENSE)
