package com.lumilab.meowwork;

import android.content.Intent;
import android.net.Uri;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryProductDetailsResult;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@CapacitorPlugin(name = "MeowStoreBilling")
public class MeowStoreBillingPlugin extends Plugin {
    private final Set<String> productIds = new HashSet<>(Arrays.asList("meowwork.pro.monthly", "meowwork.pro.yearly"));
    private BillingClient billingClient;
    private final Map<String, ProductDetails> products = new HashMap<>();
    private final Map<String, ProductDetails.SubscriptionOfferDetails> selectedOffers = new HashMap<>();
    private PluginCall pendingPurchaseCall;

    @Override
    public void load() {
        billingClient = BillingClient.newBuilder(getContext())
            .setListener(this::onPurchasesUpdated)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().enablePrepaidPlans().build())
            .build();
    }

    @PluginMethod
    public void getProducts(PluginCall call) {
        withConnection(call, () -> {
            List<QueryProductDetailsParams.Product> requested = new ArrayList<>();
            for (String id : productIds) {
                requested.add(QueryProductDetailsParams.Product.newBuilder().setProductId(id)
                    .setProductType(BillingClient.ProductType.SUBS).build());
            }
            QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder().setProductList(requested).build();
            billingClient.queryProductDetailsAsync(params, (result, response) -> {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) { reject(call, result); return; }
                JSArray rows = new JSArray();
                products.clear();
                selectedOffers.clear();
                for (ProductDetails details : response.getProductDetailsList()) {
                    products.put(details.getProductId(), details);
                    List<ProductDetails.SubscriptionOfferDetails> offers = details.getSubscriptionOfferDetails();
                    if (offers == null) offers = new ArrayList<>();
                    ProductDetails.SubscriptionOfferDetails trial = null;
                    for (ProductDetails.SubscriptionOfferDetails candidate : offers) {
                        for (ProductDetails.PricingPhase phase : candidate.getPricingPhases().getPricingPhaseList()) {
                            if ("P3D".equals(phase.getBillingPeriod()) && phase.getPriceAmountMicros() == 0L) trial = candidate;
                        }
                    }
                    ProductDetails.SubscriptionOfferDetails selected = trial != null ? trial : (offers.isEmpty() ? null : offers.get(0));
                    if (selected != null) selectedOffers.put(details.getProductId(), selected);
                    String price = "";
                    if (selected != null) {
                        List<ProductDetails.PricingPhase> phases = selected.getPricingPhases().getPricingPhaseList();
                        if (!phases.isEmpty()) price = phases.get(phases.size() - 1).getFormattedPrice();
                    }
                    JSObject row = new JSObject();
                    row.put("id", details.getProductId());
                    row.put("displayName", details.getName());
                    row.put("description", details.getDescription());
                    row.put("displayPrice", price);
                    row.put("eligibleForIntroOffer", trial != null);
                    putArray(rows, row);
                }
                JSObject responseBody = new JSObject();
                responseBody.put("products", rows);
                responseBody.put("platform", "android");
                call.resolve(responseBody);
            });
        });
    }

    @PluginMethod
    public void purchase(PluginCall call) {
        withConnection(call, () -> {
            String id = call.getString("productId");
            String accountId = call.getString("appAccountToken");
            if (id == null || !productIds.contains(id)) { call.reject("Unknown Google Play product"); return; }
            if (accountId == null) { call.reject("Missing app account id"); return; }
            ProductDetails details = products.get(id);
            ProductDetails.SubscriptionOfferDetails offer = selectedOffers.get(id);
            if (details == null || offer == null) { call.reject("Load Google Play products before purchase"); return; }
            BillingFlowParams.ProductDetailsParams item = BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(details).setOfferToken(offer.getOfferToken()).build();
            BillingFlowParams params = BillingFlowParams.newBuilder().setProductDetailsParamsList(Arrays.asList(item))
                .setObfuscatedAccountId(sha256(accountId.toLowerCase())).build();
            BillingResult result = billingClient.launchBillingFlow(getActivity(), params);
            if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) reject(call, result);
            else pendingPurchaseCall = call;
        });
    }

    @PluginMethod public void getUnfinishedTransactions(PluginCall call) { queryPurchases(call, "transactions"); }
    @PluginMethod public void getCurrentEntitlements(PluginCall call) { queryPurchases(call, "entitlements"); }
    @PluginMethod public void restorePurchases(PluginCall call) { queryPurchases(call, "entitlements"); }

    @PluginMethod
    public void finishTransaction(PluginCall call) {
        // The secure Supabase verifier acknowledges Google Play subscriptions.
        JSObject result = new JSObject();
        result.put("finished", true);
        call.resolve(result);
    }

    @PluginMethod
    public void manageSubscriptions(PluginCall call) {
        Uri uri = Uri.parse("https://play.google.com/store/account/subscriptions?package=" + getContext().getPackageName());
        try {
            getActivity().startActivity(new Intent(Intent.ACTION_VIEW, uri));
            call.resolve(new JSObject().put("opened", true).put("platform", "android"));
        } catch (Exception error) {
            call.reject("Unable to open Google Play subscription management", null, error);
        }
    }

    @Override
    public void handleOnResume() {
        super.handleOnResume();
        refreshPurchases();
    }

    private void refreshPurchases() {
        if (billingClient == null) return;
        Runnable query = () -> billingClient.queryPurchasesAsync(
            QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build(),
            (result, purchases) -> {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) return;
                for (Purchase purchase : purchases) {
                    if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED && containsProduct(purchase)) {
                        notifyListeners("transactionUpdated", purchasePayload(purchase), true);
                    }
                }
            });
        if (billingClient.isReady()) query.run();
        else billingClient.startConnection(new BillingClientStateListener() {
            @Override public void onBillingSetupFinished(BillingResult result) { if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) query.run(); }
            @Override public void onBillingServiceDisconnected() { }
        });
    }

    private void queryPurchases(PluginCall call, String key) {
        withConnection(call, () -> billingClient.queryPurchasesAsync(
            QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build(),
            (result, purchases) -> {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) { reject(call, result); return; }
                JSArray rows = new JSArray();
                for (Purchase purchase : purchases) {
                    if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED && containsProduct(purchase)) putArray(rows, purchasePayload(purchase));
                }
                JSObject body = new JSObject();
                body.put("platform", "android");
                body.put(key, rows);
                body.put("entitlements", rows);
                call.resolve(body);
            }));
    }

    private void onPurchasesUpdated(BillingResult result, List<Purchase> purchases) {
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
            if (pendingPurchaseCall != null) {
                if (result.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
                    pendingPurchaseCall.resolve(new JSObject().put("cancelled", true).put("platform", "android"));
                } else pendingPurchaseCall.reject("Google Play purchase failed: " + result.getDebugMessage());
                pendingPurchaseCall = null;
            }
            return;
        }
        if (purchases == null) return;
        for (Purchase purchase : purchases) {
            if (!containsProduct(purchase)) continue;
            JSObject payload = purchasePayload(purchase);
            boolean deliveredToPurchaseCall = false;
            if (pendingPurchaseCall != null) {
                if (purchase.getPurchaseState() == Purchase.PurchaseState.PENDING) {
                    payload.put("pending", true);
                    pendingPurchaseCall.resolve(payload);
                    pendingPurchaseCall = null;
                    deliveredToPurchaseCall = true;
                } else if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                    pendingPurchaseCall.resolve(payload);
                    pendingPurchaseCall = null;
                    deliveredToPurchaseCall = true;
                }
            }
            if (!deliveredToPurchaseCall) notifyListeners("transactionUpdated", payload, true);
        }
    }

    private boolean containsProduct(Purchase purchase) {
        for (String id : purchase.getProducts()) if (productIds.contains(id)) return true;
        return false;
    }

    private JSObject purchasePayload(Purchase purchase) {
        JSArray productList = new JSArray();
        for (String id : purchase.getProducts()) putArray(productList, id);
        JSObject payload = new JSObject();
        payload.put("platform", "android");
        payload.put("id", purchase.getPurchaseToken());
        payload.put("purchaseToken", purchase.getPurchaseToken());
        payload.put("productId", purchase.getProducts().isEmpty() ? "" : purchase.getProducts().get(0));
        payload.put("productIds", productList);
        payload.put("purchaseState", purchase.getPurchaseState());
        payload.put("acknowledged", purchase.isAcknowledged());
        return payload;
    }

    private void withConnection(PluginCall call, Runnable action) {
        if (billingClient == null) { call.reject("Google Play Billing is unavailable"); return; }
        if (billingClient.isReady()) { action.run(); return; }
        billingClient.startConnection(new BillingClientStateListener() {
            @Override public void onBillingSetupFinished(BillingResult result) { if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) action.run(); else reject(call, result); }
            @Override public void onBillingServiceDisconnected() { }
        });
    }

    private void reject(PluginCall call, BillingResult result) {
        call.reject("Google Play Billing error " + result.getResponseCode() + ": " + result.getDebugMessage());
    }

    private void putArray(JSArray array, Object value) {
        array.put(value);
    }

    private String sha256(String input) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder value = new StringBuilder();
            for (byte item : digest) value.append(String.format("%02x", item));
            return value.toString();
        } catch (Exception error) { throw new IllegalStateException("Unable to hash app account id", error); }
    }
}
