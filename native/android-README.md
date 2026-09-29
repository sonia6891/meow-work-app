# Android Play release bootstrap

The Android shell is generated reproducibly from Capacitor. From `native/` run:

```sh
npm ci
npm run cap:add:android
npx cap sync android
```

The generated project must use the shared application ID `com.lumilab.meowwork`, Android 16 / API 36 or later as `targetSdk`, and a Play App Signing upload key held outside Git. Keep the generated `android/` project in source control after bootstrap so Play build and signing configuration are reviewable.

## Google Play Billing

The Android Capacitor bridge is in `android-sources/MeowStoreBillingPlugin.java` and is installed into the generated project by `scripts/patch-android-billing.mjs`. It implements product lookup, purchase and pending states, foreground purchase re-query, restore, and subscription management through Google Play Billing Library 9.1.0. The web layer grants Pro only after the Supabase verifier accepts the purchase token.

Google Play Console must contain the app record, matching monthly/yearly subscriptions, and three-day introductory offers before product queries can return them. The first app bundle may need to be uploaded manually through Play Console before API-based internal-track uploads are enabled. The package name, service account, Pub/Sub topic, and RTDN subscription are owner-controlled Play Console / Google Cloud setup and are intentionally not fabricated in this repository. Backend functions and required secrets are listed in `../docs/dual-store-release-status-2026-09-30.md`.

For native Google and LINE sign-in, add `com.lumilab.meowwork://auth/callback` to the Supabase Auth redirect URL allowlist. The iOS URL scheme and Android intent filter are applied by the native patch scripts. Test both identity providers on physical devices because provider console configuration and Supabase allowlists are account-specific.

## Build credentials

Never commit upload keystores, passwords, Google service-account JSON, or Play API access tokens. The generated release Gradle configuration reads `MEOW_UPLOAD_KEYSTORE`, `MEOW_UPLOAD_STORE_PASSWORD`, `MEOW_UPLOAD_KEY_ALIAS`, and `MEOW_UPLOAD_KEY_PASSWORD` from the environment. Configure GitHub secrets `PLAY_UPLOAD_KEYSTORE_BASE64`, `PLAY_UPLOAD_KEY_ALIAS`, `PLAY_UPLOAD_STORE_PASSWORD`, `PLAY_UPLOAD_KEY_PASSWORD`, and `PLAY_SERVICE_ACCOUNT_JSON`. The release workflow uploads the signed AAB to the Google Play internal testing track; it does not publish to production. Use Play App Signing.
