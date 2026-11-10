import "server-only";

/**
 * Thin client for the PayPal REST APIs this app uses:
 * - Orders v2 (CAPTURE for a café purchase, AUTHORIZE for a coffee treat)
 * - Payments v2 (capture / void an authorization)
 * - Log in with PayPal (OAuth code flow + userinfo)
 */

const ENV = process.env.PAYPAL_ENVIRONMENT === "production" ? "production" : "sandbox";
export const PAYPAL_API =
  ENV === "production" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
const PAYPAL_WEB = ENV === "production" ? "https://www.paypal.com" : "https://www.sandbox.paypal.com";

export class PayPalError extends Error {
  constructor(
    message: string,
    public status: number,
    public details: unknown,
  ) {
    super(message);
  }
}

function credentials() {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error("PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET are not set");
  return Buffer.from(`${id}:${secret}`).toString("base64");
}

export function paypalConfigured() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) throw new PayPalError("PayPal auth failed", res.status, json);
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cachedToken.value;
}

async function call<T>(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown; requestId?: string },
): Promise<T> {
  const token = await accessToken();
  const res = await fetch(`${PAYPAL_API}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.requestId ? { "PayPal-Request-Id": init.requestId } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const issue = json?.details?.[0]?.issue ?? json?.name ?? "PAYPAL_ERROR";
    throw new PayPalError(`PayPal ${init.method} ${path} failed: ${issue}`, res.status, json);
  }
  return json as T;
}

const money = (cents: number) => (cents / 100).toFixed(2);

export type PayPalOrder = {
  id: string;
  status: string;
  intent?: string;
  purchase_units?: Array<{
    reference_id?: string;
    custom_id?: string;
    amount?: { currency_code: string; value: string };
    payments?: {
      captures?: Array<{ id: string; status: string; amount?: { currency_code: string; value: string } }>;
      authorizations?: Array<{ id: string; status: string; expiration_time?: string }>;
    };
  }>;
  payer?: { payer_id?: string; email_address?: string };
};

export async function createOrder(opts: {
  intent: "CAPTURE" | "AUTHORIZE";
  cafeName: string;
  itemName: string;
  amountCents: number;
  referenceId: string;
  customId: string;
  description: string;
  requestId: string;
}): Promise<PayPalOrder> {
  const value = money(opts.amountCents);
  return call<PayPalOrder>("/v2/checkout/orders", {
    method: "POST",
    requestId: opts.requestId,
    body: {
      intent: opts.intent,
      purchase_units: [
        {
          reference_id: opts.referenceId,
          custom_id: opts.customId,
          description: opts.description.slice(0, 127),
          soft_descriptor: "COMMONGROUNDS",
          amount: {
            currency_code: "USD",
            value,
            breakdown: { item_total: { currency_code: "USD", value } },
          },
          items: [
            {
              name: opts.itemName.slice(0, 127),
              quantity: "1",
              unit_amount: { currency_code: "USD", value },
              category: "PHYSICAL_GOODS",
            },
          ],
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: opts.cafeName.slice(0, 127),
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW",
          },
        },
      },
    },
  });
}

export function getOrder(orderId: string) {
  return call<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(orderId)}`, { method: "GET" });
}

export function captureOrder(orderId: string) {
  return call<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: "POST",
    body: {},
    requestId: `capture-${orderId}`,
  });
}

export function authorizeOrder(orderId: string) {
  return call<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(orderId)}/authorize`, {
    method: "POST",
    body: {},
    requestId: `authorize-${orderId}`,
  });
}

export function captureAuthorization(authorizationId: string) {
  return call<{ id: string; status: string }>(
    `/v2/payments/authorizations/${encodeURIComponent(authorizationId)}/capture`,
    { method: "POST", body: { final_capture: true }, requestId: `capture-auth-${authorizationId}` },
  );
}

export function voidAuthorization(authorizationId: string) {
  return call<void>(`/v2/payments/authorizations/${encodeURIComponent(authorizationId)}/void`, {
    method: "POST",
    requestId: `void-${authorizationId}`,
  });
}

// ---------------------------------------------------------------------------
// Log in with PayPal
// ---------------------------------------------------------------------------

const LOGIN_SCOPES =
  process.env.PAYPAL_LOGIN_SCOPES ??
  "openid profile email https://uri.paypal.com/services/paypalattributes";

export function loginUrl(redirectUri: string, state: string, scopes = LOGIN_SCOPES) {
  const params = new URLSearchParams({
    flowEntry: "static",
    client_id: process.env.PAYPAL_CLIENT_ID ?? "",
    response_type: "code",
    scope: scopes,
    redirect_uri: redirectUri,
    state,
  });
  return `${PAYPAL_WEB}/connect?${params.toString()}`;
}

export type PayPalUserInfo = {
  userId: string;
  name: string | null;
  email: string | null;
  /** YYYY-MM-DD, only if PayPal shared it. */
  birthdate: string | null;
  verifiedAccount: boolean | null;
  raw: Record<string, unknown>;
};

export async function exchangeLoginCode(code: string): Promise<PayPalUserInfo> {
  const tokenRes = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "authorization_code", code }).toString(),
    cache: "no-store",
  });
  const token = await tokenRes.json();
  if (!tokenRes.ok) throw new PayPalError("Log in with PayPal: token exchange failed", tokenRes.status, token);

  const infoRes = await fetch(`${PAYPAL_API}/v1/identity/oauth2/userinfo?schema=paypalv1.1`, {
    headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  const info = await infoRes.json();
  if (!infoRes.ok) throw new PayPalError("Log in with PayPal: userinfo failed", infoRes.status, info);

  const emails = Array.isArray(info.emails) ? info.emails : [];
  const primaryEmail =
    emails.find((e: { primary?: boolean }) => e.primary)?.value ?? emails[0]?.value ?? info.email ?? null;
  const birthdate = typeof info.birthdate === "string" ? normalizeBirthdate(info.birthdate) : null;

  return {
    userId: String(info.user_id ?? info.sub ?? info.payer_id),
    name: info.name ?? null,
    email: primaryEmail,
    birthdate,
    verifiedAccount:
      typeof info.verified_account === "boolean"
        ? info.verified_account
        : info.verified_account === "true"
          ? true
          : null,
    raw: info,
  };
}

/** PayPal may send YYYY-MM-DD, a full timestamp, or a 0000 year (meaning "not shared"). */
function normalizeBirthdate(value: string): string | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m || m[1] === "0000") return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}
