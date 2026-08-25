# LocoXperts Navigator: Google Play Store Registration & Release Guide

This document provides a step-by-step enterprise guide for registering, configuring, signing, and publishing **LocoXperts Navigator** (`com.locoxperts.navigator`) to the **Google Play Store**.

---

## 📋 Table of Contents
1. [Prerequisites & Account Setup](#1-prerequisites--account-setup)
2. [Google Play Console App Creation](#2-google-play-console-app-creation)
3. [Store Listing & Marketing Assets](#3-store-listing--marketing-assets)
4. [Mandatory Policy & Data Safety Declarations](#4-mandatory-policy--data-safety-declarations)
5. [Building the Production App Bundle (.aab)](#5-building-the-production-app-bundle-aab)
6. [Google Play App Signing & Digital Asset Links](#6-google-play-app-signing--digital-asset-links)
7. [Testing Tracks & Production Rollout](#7-testing-tracks--production-rollout)

---

## 1. Prerequisites & Account Setup

### A. Google Play Developer Account
1. Visit the [Google Play Console](https://play.google.com/console/signup).
2. Sign in with your official company or developer Google Account.
3. Select account type:
   - **Organization (Recommended):** Requires a D-U-N-S Number and legal business verification.
   - **Individual:** Requires government photo ID verification.
4. Pay the **$25 one-time registration fee**.
5. Complete identity and address verification.

---

## 2. Google Play Console App Creation

1. In the Google Play Console dashboard, click **Create app** (top right).
2. Configure initial details:
   - **App name:** `LocoXperts Navigator`
   - **Default language:** `English (United States)`
   - **App or game:** `App`
   - **Free or paid:** `Free`
3. Accept the **Developer Program Policies** and **US Export Laws** declarations.
4. Click **Create app**.

---

## 3. Store Listing & Marketing Assets

Navigate to **Grow $\to$ Store presence $\to$ Main store listing**:

### A. Text Metadata
* **Short Description (max 80 chars):**  
  `Offline mountain bike trail navigation, GPX routing, and live telemetry.`
* **Full Description (max 4,000 chars):**  
  ```text
  LocoXperts Navigator is built for mountain bikers, trail runners, and outdoor explorers.

  KEY FEATURES:
  • Offline Vector Topo Maps: Download maps once and navigate deep trails without cellular reception.
  • Smart "Guide Back" Navigation: Rejoin trails seamlessly with intelligent road network routing and forward-merging trajectory guidance.
  • Turn-by-Turn Maneuvers: Clear real-time turn cues and trail flow direction chevrons.
  • Live Telemetry & Elevation Profiles: Track real-time speed, grade, cumulative climb gain, and altitude peaks.
  • Hardware Fused Compass: Rock-solid directional orientation with vibration filtering.
  • Privacy First: Foreground-only GPS tracking with residential privacy masking zones.
  • GPX Import: Upload and ride any custom GPX trail file directly.
  ```

### B. Graphic Assets

| Asset Type | Dimension | Format | File in Project |
| :--- | :--- | :--- | :--- |
| **App Icon** | $512 \times 512\text{ px}$ | 32-bit PNG (up to 1MB) | [`mobile/assets/icon.png`](file:///Users/dibyan/Projects/new_projects/mtb-trail-finder/mobile/assets/icon.png) |
| **Feature Graphic** | $1024 \times 500\text{ px}$ | JPG or 24-bit PNG | Mountain trail landscape with LocoXperts logo |
| **Phone Screenshots** | Min 2, Max 8 (16:9 / 18:9) | JPG/PNG | Main Menu, Active Trail Map, Elevation Sheet |

---

## 4. Mandatory Policy & Data Safety Declarations

Navigate to **Policy and programs $\to$ App content**:

### A. Privacy Policy
* **URL:** `https://www.locoxperts.com/privacy`

### B. Location Permissions (Critical for Approval)
* Google Play requires strict justification for location access:
  - **Permission:** Foreground location only (`ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`).
  - **Usage Description:** *“LocoXperts uses foreground location solely while the user is actively recording or navigating a mountain bike trail to display live speed, position on the map, and off-route guidance.”*
  - **Background location:** Declare **No** (we do not use background location in this MVP).

### C. Data Safety Form
* **Does your app collect or share user data?** Yes.
* **Data Types Collected:**
  - **Location (Approximate & Precise):** Collected for app functionality (navigation). Ephemeral during ride.
  - **User IDs / Account Info:** (If logged in).
* **Data Handling:**
  - **Is data encrypted in transit?** Yes (HTTPS/TLS).
  - **Can users request data deletion?** Yes (Provide `https://www.locoxperts.com/account/delete` or support email).

### D. Target Audience & Content Rating
* **Target age:** 18 and over (or 13+).
* **Complete Content Rating Questionnaire:** Select "Utility/Navigation" (Rated Everyone / PEGI 3).

---

## 5. Building the Production App Bundle (.aab)

Google Play **requires** the modern `.aab` (Android App Bundle) format instead of `.apk`.

### Option A: Local Build (Without EAS)
Run inside the `mobile` folder:
```bash
cd mobile
npm run build:aab
```
* **Output File:** `mobile/android/app/build/outputs/bundle/release/app-release.aab`

---

### Option B: Cloud EAS Build (Recommended for Automated Keystores)
```bash
cd mobile
npx eas-cli build --platform android --profile production
```
* When prompted, EAS will automatically generate and safely store your **Android Release Keystore**.
* Download the compiled `.aab` artifact upon completion.

---

## 6. Google Play App Signing & Digital Asset Links

### A. App Signing
Google Play automatically encrypts and signs your release bundles with Google Play App Signing.

### B. Verified Android App Links
To allow `https://www.locoxperts.com/trails/<slug>` links to open directly in the app without browser prompts:

1. In Play Console, go to **Release $\to$ Setup $\to$ App signing**.
2. Copy the **SHA-256 certificate fingerprint**.
3. Ensure [`public/.well-known/assetlinks.json`](file:///Users/dibyan/Projects/new_projects/mtb-trail-finder/public/.well-known/assetlinks.json) contains:
```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.locoxperts.navigator",
      "sha256_cert_fingerprints": [
        "<YOUR_PLAY_STORE_SHA256_FINGERPRINT>"
      ]
    }
  }
]
```

---

## 7. Testing Tracks & Production Rollout

### Step 1: Internal Testing Track (Immediate)
1. Go to **Testing $\to$ Internal testing**.
2. Click **Create new release**.
3. Upload your `app-release.aab` bundle.
4. Set release name: `0.1.0 (1)`.
5. Under **Testers**, create an email list (e.g. `team@locoxperts.com`).
6. Click **Save $\to$ Review release $\to$ Start rollout to Internal Testing**.
7. Share the join link with your team to test the install directly from the Play Store!

### Step 2: Production Release
1. Once internal testing passes, go to **Release $\to$ Production**.
2. Click **Create new release** (or promote from Internal Testing).
3. Add **Release Notes** in English.
4. Click **Review release $\to$ Start rollout to Production**.
5. Google will review the app (typically 1–3 business days). Once approved, **LocoXperts Navigator** will be live globally!
