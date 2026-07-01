# LocoXperts Navigator (Android MVP)

The app opens `locoxperts://navigate/<trail-id-or-slug>` and verified
`https://www.locoxperts.com/trails/<trail-id-or-slug>` links. It caches trail data and a
MapLibre offline region, navigates without an account, and only uploads anonymous GPS points after
the rider explicitly opts in. If a link or server route is unavailable, the rider can import a GPX
track from Android's file picker and navigate it locally without uploading the route.

## Run locally

1. Use Node 22.13 or newer and install dependencies inside this directory with `npm install`.
2. Copy `.env.example` to `.env` and set the API base URL and a production MapLibre-compatible
   style URL. The demo style is development-only and its tile usage terms must not be assumed to
   cover production offline downloads.
3. Run `npm run android`. MapLibre is native code, so Expo Go is not supported.

For the standard Android Studio emulator, set `EXPO_PUBLIC_API_BASE_URL` to
`http://10.0.2.2:3000`. Android maps `10.0.2.2` to the development machine's localhost. Restart
Metro after changing this value. Physical devices must use the development machine's LAN address
instead.

## App links

Before release, publish `/.well-known/assetlinks.json` on `www.locoxperts.com` using the SHA-256
fingerprint of the Play signing certificate. Until that exists, the custom `locoxperts://` links
still work but HTTPS links are not verified Android App Links.

## Privacy boundary

Location collection is foreground-only in this MVP. The route and offline map work without login
and without telemetry. The opt-in disclosure is shown before creating a server session. The device
stores the opaque session token and queues points locally if an upload fails. Server retention is
currently 180 days.
