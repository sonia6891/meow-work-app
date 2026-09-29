import { createClient } from "npm:@supabase/supabase-js@2";
import { entitlementFromSubscription, fetchSubscription, getGooglePackageName, sha256Hex } from "../_shared/google-play.ts";

async function authenticatedPubSubPush(req: Request) {
  const expectedAudience = String(Deno.env.get("GOOGLE_PLAY_RTDN_AUDIENCE") || "");
  const expectedEmail = String(Deno.env.get("GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL") || "");
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!expectedAudience || !expectedEmail || !token) return false;
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
  if (!response.ok) return false;
  const claims = await response.json();
  return claims.iss === "https://accounts.google.com" && claims.aud === expectedAudience && claims.email === expectedEmail
    && claims.email_verified === "true" && Number(claims.exp || 0) > Math.floor(Date.now() / 1000);
}

function readSecret(name: string, legacy: string) {
  try {
    const parsed = JSON.parse(Deno.env.get(name) || "{}");
    if (parsed?.default) return String(parsed.default);
  } catch { /* use legacy key name */ }
  return String(Deno.env.get(legacy) || "");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  try {
    if (!await authenticatedPubSubPush(req)) return new Response("unauthorized", { status: 401 });
    const envelope = await req.json();
    const message = envelope?.message;
    if (!message?.data || !message?.messageId) return new Response("invalid Pub/Sub envelope", { status: 400 });
    const notification = JSON.parse(atob(String(message.data)));
    if (String(notification?.packageName || "") !== getGooglePackageName()) {
      return new Response("package mismatch", { status: 400 });
    }
    const eventId = `googleplay_rtdn:${String(message.messageId)}`;
    const data = notification?.subscriptionNotification;
    if (!data?.purchaseToken) return new Response("OK", { status: 200 });

    const purchaseToken = String(data.purchaseToken);
    const tokenHash = await sha256Hex(purchaseToken);
    const subscription = await fetchSubscription(purchaseToken);
    const verified = entitlementFromSubscription(subscription);
    const url = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = readSecret("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    let { data: prior, error: lookupError } = await admin.from("store_subscription_events")
      .select("user_id")
      .eq("platform", "google_play")
      .eq("transaction_id", tokenHash)
      .not("user_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!prior?.user_id && subscription?.linkedPurchaseToken) {
      const linkedHash = await sha256Hex(String(subscription.linkedPurchaseToken));
      const linked = await admin.from("store_subscription_events")
        .select("user_id")
        .eq("platform", "google_play")
        .eq("transaction_id", linkedHash)
        .not("user_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (linked.error) throw linked.error;
      prior = linked.data;
    }
    const userId = prior?.user_id || null;
    const { error: eventError } = await admin.from("store_subscription_events").upsert({
      event_id: eventId,
      platform: "google_play",
      user_id: userId,
      event_type: `RTDN_${String(data.notificationType || "UNKNOWN")}`,
      subtype: verified.status.toUpperCase(),
      product_id: verified.productId,
      transaction_id: tokenHash,
      original_transaction_id: String(subscription?.latestOrderId || "") || null,
      environment: subscription?.testPurchase ? "TEST" : "PRODUCTION",
      signed_at: new Date(Number(notification?.eventTimeMillis || Date.now())).toISOString(),
      expires_at: verified.expiresAt,
      raw: { notification, subscription },
    }, { onConflict: "event_id" });
    if (eventError) throw eventError;

    // RTDN can arrive before the client finishes verification. Record the event
    // first; the authenticated purchase verification call will bind the token.
    if (!userId) return new Response("OK", { status: 200 });
    const entitlement: Record<string, unknown> = {
      user_id: userId,
      plan: verified.plan,
      status: verified.status,
      pro_until: verified.expiresAt,
      source: "google_play",
      billing_provider: "google_play",
      provider_subscription_id: tokenHash,
      cancel_at_period_end: verified.status === "canceled",
      canceled_at: verified.status === "canceled" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    if (verified.trialStartedAt) entitlement.trial_started_at = verified.trialStartedAt;
    const { error: entitlementError } = await admin.from("user_entitlements").upsert(entitlement, { onConflict: "user_id" });
    if (entitlementError) throw entitlementError;
    return new Response("OK", { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("google-play-rtdn", message);
    const status = message === "google_play_not_configured" ? 503 : 500;
    return new Response("notification processing failed", { status });
  }
});
