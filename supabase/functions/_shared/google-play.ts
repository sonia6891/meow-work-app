const PRODUCT_IDS = new Set(["meowwork.pro.monthly", "meowwork.pro.yearly"]);

export function getGooglePlayConfig() {
  const packageName = String(Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME") || "").trim();
  let accountRaw = String(Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON") || "").trim();
  if (packageName !== "com.lumilab.meowwork" || !accountRaw) throw new Error("google_play_not_configured");
  let account = JSON.parse(accountRaw);
  if (typeof account === "string") account = JSON.parse(account);
  if (account?.default && typeof account.default === "string") account = JSON.parse(account.default);
  if (!account.client_email || !account.private_key) throw new Error("google_play_credentials_invalid");
  return { packageName, account };
}

function base64url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => binary += String.fromCharCode(byte));
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function encodeJson(value: unknown) {
  return base64url(new TextEncoder().encode(JSON.stringify(value)));
}

function pemBytes(value: string) {
  const body = value.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  return Uint8Array.from(atob(body), (character) => character.charCodeAt(0));
}

async function googleAccessToken(account: any) {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${encodeJson({ alg: "RS256", typ: "JWT", kid: account.private_key_id })}.${encodeJson({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const key = await crypto.subtle.importKey("pkcs8", pemBytes(account.private_key), {
    name: "RSASSA-PKCS1-v1_5", hash: "SHA-256",
  }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)));
  const assertion = `${unsigned}.${base64url(signature)}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!response.ok) throw new Error("google_oauth_exchange_failed");
  return String((await response.json()).access_token || "");
}

export async function googlePlayApi(path: string, method = "GET", body?: unknown) {
  const { packageName, account } = getGooglePlayConfig();
  const token = await googleAccessToken(account);
  const response = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  if (!response.ok) {
    console.error("google-play-api", response.status, text.slice(0, 1200));
    throw new Error(`google_play_api_${response.status}`);
  }
  return text ? JSON.parse(text) : {};
}

export async function fetchSubscription(purchaseToken: string) {
  const token = encodeURIComponent(purchaseToken);
  return await googlePlayApi(`purchases/subscriptionsv2/tokens/${token}`);
}

export async function acknowledgeSubscription(productId: string, purchaseToken: string) {
  if (!PRODUCT_IDS.has(productId)) throw new Error("unknown_product");
  const token = encodeURIComponent(purchaseToken);
  return await googlePlayApi(`purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${token}:acknowledge`, "POST", {});
}

export function isGoogleProduct(productId: string) {
  return PRODUCT_IDS.has(productId);
}

export function getGooglePackageName() {
  return getGooglePlayConfig().packageName;
}

export async function sha256Hex(value: string) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function entitlementFromSubscription(subscription: any) {
  const state = String(subscription?.subscriptionState || "");
  const items = Array.isArray(subscription?.lineItems) ? subscription.lineItems : [];
  const item = [...items].sort((left, right) => Date.parse(String(right.expiryTime || "0")) - Date.parse(String(left.expiryTime || "0")))[0];
  const productId = String(item?.productId || "");
  if (!PRODUCT_IDS.has(productId)) throw new Error("unknown_product");
  const expiresAt = String(item?.expiryTime || "");
  const expiry = Date.parse(expiresAt);
  const future = Number.isFinite(expiry) && expiry > Date.now();
  const trial = future && !!item?.offerPhase?.freeTrial;
  let status = "expired";
  if (future && state === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD") status = "grace_period";
  else if (future && state === "SUBSCRIPTION_STATE_CANCELED") status = "canceled";
  else if (future && state === "SUBSCRIPTION_STATE_ACTIVE") status = trial ? "trialing" : "active";
  else if (state === "SUBSCRIPTION_STATE_ON_HOLD" || state === "SUBSCRIPTION_STATE_PAUSED") status = "past_due";
  const active = ["active", "trialing", "grace_period", "canceled"].includes(status) && future;
  return { productId, expiresAt: expiresAt || null, status, plan: active ? "pro" : "free", active, trialStartedAt: trial ? String(subscription.startTime || "") || null : null };
}
