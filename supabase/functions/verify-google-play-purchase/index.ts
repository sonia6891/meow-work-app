import { createClient } from "npm:@supabase/supabase-js@2";
import { acknowledgeSubscription, entitlementFromSubscription, fetchSubscription, isGoogleProduct, sha256Hex } from "../_shared/google-play.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function secret(name: string, legacy: string) {
  try {
    const parsed = JSON.parse(Deno.env.get(name) || "{}");
    if (parsed?.default) return String(parsed.default);
  } catch { /* use legacy key name */ }
  return String(Deno.env.get(legacy) || "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return Response.json({ error: "method_not_allowed" }, { status: 405, headers: cors });
  try {
    const authorization = req.headers.get("Authorization") || "";
    const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!accessToken) return Response.json({ error: "not_authenticated" }, { status: 401, headers: cors });

    const url = Deno.env.get("SUPABASE_URL") || "";
    const publicKey = secret("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
    const serviceKey = secret("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
    const userClient = createClient(url, publicKey, { auth: { persistSession: false } });
    const { data, error } = await userClient.auth.getUser(accessToken);
    if (error || !data.user) return Response.json({ error: "invalid_session" }, { status: 401, headers: cors });
    const user = data.user;

    const body = await req.json().catch(() => ({}));
    const purchaseToken = String(body?.purchaseToken || "");
    const requestedProductId = String(body?.productId || "");
    if (purchaseToken.length < 20 || purchaseToken.length > 4096 || !isGoogleProduct(requestedProductId)) {
      return Response.json({ error: "invalid_purchase" }, { status: 400, headers: cors });
    }

    const subscription = await fetchSubscription(purchaseToken);
    const status = String(subscription?.subscriptionState || "");
    if (status === "SUBSCRIPTION_STATE_PENDING" || status === "SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED") {
      return Response.json({ ok: true, pending: true }, { status: 202, headers: cors });
    }
    const verified = entitlementFromSubscription(subscription);
    if (verified.productId !== requestedProductId) return Response.json({ error: "product_mismatch" }, { status: 403, headers: cors });

    const expectedAccount = await sha256Hex(user.id.toLowerCase());
    const linkedAccount = String(subscription?.externalAccountIdentifiers?.obfuscatedExternalAccountId || "").toLowerCase();
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const tokenHash = await sha256Hex(purchaseToken);
    if (!linkedAccount || linkedAccount !== expectedAccount) {
      // Account deletion orphans store events. Let the same verified Play
      // token attach to a new app account only when no live account owns it.
      const { data: linkedRows, error: linkedError } = await admin.from("store_subscription_events")
        .select("user_id")
        .eq("platform", "google_play")
        .eq("transaction_id", tokenHash)
        .limit(20);
      if (linkedError) throw linkedError;
      const liveOwners = [...new Set((linkedRows || []).map((row: any) => row.user_id).filter(Boolean))];
      const hasOrphan = (linkedRows || []).some((row: any) => !row.user_id);
      if (liveOwners.length || !hasOrphan) return Response.json({ error: "account_token_mismatch" }, { status: 403, headers: cors });
    }

    const latestOrder = String(subscription?.latestOrderId || "");
    const eventId = `googleplay_token:${tokenHash}`;
    const { error: eventError } = await admin.from("store_subscription_events").upsert({
      event_id: eventId,
      platform: "google_play",
      user_id: user.id,
      event_type: "CLIENT_VERIFIED_SUBSCRIPTION",
      subtype: verified.status.toUpperCase(),
      product_id: verified.productId,
      transaction_id: tokenHash,
      original_transaction_id: latestOrder || null,
      environment: subscription?.testPurchase ? "TEST" : "PRODUCTION",
      signed_at: new Date().toISOString(),
      expires_at: verified.expiresAt,
      raw: subscription,
    }, { onConflict: "event_id" });
    if (eventError) throw eventError;

    const entitlement: Record<string, unknown> = {
      user_id: user.id,
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

    if (verified.active && subscription?.acknowledgementState === "ACKNOWLEDGEMENT_STATE_PENDING") {
      await acknowledgeSubscription(verified.productId, purchaseToken);
    }
    return Response.json({ ok: true, platform: "google_play", ...verified }, { headers: cors });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("verify-google-play-purchase", message);
    const status = message.startsWith("google_play_") || message.startsWith("google_oauth_") ? 503 : 400;
    return Response.json({ error: "google_play_verification_failed", message }, { status, headers: cors });
  }
});
