import { entitlementFromSubscription } from "../supabase/functions/_shared/google-play.ts";

const future = "2099-01-01T00:00:00Z";

function expect(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

Deno.test("active Play subscription grants Pro until expiry", () => {
  const entitlement = entitlementFromSubscription({
    subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
    lineItems: [{ productId: "meowwork.pro.monthly", expiryTime: future }],
  });
  expect(entitlement.plan === "pro" && entitlement.status === "active" && entitlement.active, "active purchase must grant Pro");
  expect(entitlement.expiresAt === future, "expiry must come from Play Developer API state");
});

Deno.test("free trial is granted only from a verified Play free-trial phase", () => {
  const entitlement = entitlementFromSubscription({
    subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
    startTime: "2098-12-29T00:00:00Z",
    lineItems: [{ productId: "meowwork.pro.yearly", expiryTime: future, offerPhase: { freeTrial: {} } }],
  });
  expect(entitlement.plan === "pro" && entitlement.status === "trialing", "verified trial must report trialing Pro");

  const paid = entitlementFromSubscription({
    subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
    lineItems: [{ productId: "meowwork.pro.yearly", expiryTime: future, offerPhase: { basePrice: {} } }],
  });
  expect(paid.status === "active", "non-trial offer phase must not be reported as a trial");
});

Deno.test("cancelled subscription keeps Pro only through the verified expiry", () => {
  const active = entitlementFromSubscription({
    subscriptionState: "SUBSCRIPTION_STATE_CANCELED",
    lineItems: [{ productId: "meowwork.pro.monthly", expiryTime: future }],
  });
  expect(active.plan === "pro" && active.status === "canceled", "canceled-but-unexpired subscription must retain Pro");

  const expired = entitlementFromSubscription({
    subscriptionState: "SUBSCRIPTION_STATE_EXPIRED",
    lineItems: [{ productId: "meowwork.pro.monthly", expiryTime: "2000-01-01T00:00:00Z" }],
  });
  expect(expired.plan === "free" && !expired.active, "expired subscription must not grant Pro");
});

Deno.test("pending and on-hold purchases do not grant Pro", () => {
  const pending = entitlementFromSubscription({
    subscriptionState: "SUBSCRIPTION_STATE_PENDING",
    lineItems: [{ productId: "meowwork.pro.monthly", expiryTime: future }],
  });
  expect(pending.plan === "free" && !pending.active, "pending purchase must not grant Pro");

  const onHold = entitlementFromSubscription({
    subscriptionState: "SUBSCRIPTION_STATE_ON_HOLD",
    lineItems: [{ productId: "meowwork.pro.monthly", expiryTime: future }],
  });
  expect(onHold.plan === "free" && onHold.status === "past_due", "on-hold purchase must not grant Pro");
});

Deno.test("unknown Play product is rejected", () => {
  let rejected = false;
  try {
    entitlementFromSubscription({
      subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
      lineItems: [{ productId: "untrusted.product", expiryTime: future }],
    });
  } catch (error) {
    rejected = error instanceof Error && error.message === "unknown_product";
  }
  expect(rejected, "only the two allowlisted subscription products are accepted");
});
