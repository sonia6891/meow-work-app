# Native mobile shell

This directory is the native App Store / Google Play path for 「喵的，又要上班了」.

## Current target

- Capacitor 8.5.2
- iOS and Android Capacitor shells
- Bundle ID (provisional): `com.lumilab.meowwork`
- Pro product IDs:
  - `meowwork.pro.monthly`
  - `meowwork.pro.yearly`
- Taiwan target prices:
  - NT$99 / month
  - NT$790 / year
- Eligible first-time subscribers: 3-day free trial

## Build web assets

```bash
cd native
npm install
npm run sync:web
```

## Create iOS project

```bash
npx cap add ios
```

The repository CI bootstrap copies the StoreKit 2 Swift sources into the generated Xcode app and registers `MeowStoreBilling`. iOS restore, transaction updates, server verification and management flows are implemented; Apple Developer signing and App Store Connect product/account setup remain release-owner steps.

## Android project bootstrap

The package now includes the pinned Capacitor Android platform and scripts for generating/opening its native project. See [android-README.md](android-README.md) for the clean bootstrap procedure and Play release prerequisites. Target Android 16 / API 36 for new Play submissions from 2026-08-31.

## Important

The web preview never performs real payment. Real Pro purchases must be presented by StoreKit on iOS and Google Play Billing on Android. Supabase remains the server-side entitlement source after store verification. Android purchase tokens now use the separate Google Play Developer API verifier and RTDN handler documented below. Do not enable Android Pro purchases in production until Play Console products, Google service-account credentials, Pub/Sub OIDC settings and internal-track device tests are complete.


## Home Screen date widget

The iOS build includes a native WidgetKit extension named `MeowDateWidget`.

- Small widget: enlarged cat/App identity plus today's month, day and weekday.
- Medium widget: larger cat artwork with a larger date layout.
- Light mode uses the warm cream brand surface.
- Dark mode uses the same coffee-brown palette as the app.
- Widget timeline refreshes after midnight so the date rolls over automatically.

The CI bootstrap recreates the extension after every Capacitor iOS regeneration with:

```bash
gem install xcodeproj --no-document
ruby scripts/add-date-widget.rb
```

After installing an updated native build on iPhone, long-press the Home Screen, add a widget, and choose 「喵的，又要上班了」.
