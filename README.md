# LocoXperts

LocoXperts helps riders discover Nepal trails, review route context, plan rides with local guides,
join events, and connect with trail organizations and services.

This repository contains two applications:

- The root project is the Next.js web platform and API.
- `mobile/` is the Android-first Expo trail navigator with its own `package.json`.

Install and run each application from its own directory. The mobile app consumes the web
platform's public API; it is not a second web build.

## Core Features

- Search and filter mapped trails by location, activity, difficulty, distance, and ride profile.
- View GPX routes, trail alerts, safety context, services, campaigns, and local guide associations.
- Request trail activities and plan unfamiliar rides with verified local guides.
- Create and join free or paid events.
- Save trails and maintain participant, guide, and organization dashboards.
- Let verified guides upload trails and create organizations for programs, campaigns, services,
  teams, and trail work.
- Navigate trails from the standalone Android app, including cached routes and offline map regions.

## Requirements

### Web platform

- Node.js 20 or newer
- pnpm
- PostgreSQL

### Android navigator

- Node.js 22.13 or newer
- npm
- Android Studio and the Android SDK for local native builds

## Web Setup

1. Install dependencies from the repository root:

   ```bash
   pnpm install
   ```

2. Create `.env.local` and configure at least the application secret and database connection:

   ```dotenv
   JWT_SECRET=replace-with-a-long-random-secret
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=mtb_trail_finder
   DB_USER=postgres
   DB_PASSWORD=postgres
   ```

   `DIRECT_DATABASE_URL` can be used instead of separate database fields. Firebase, email,
   Redis, Google, Strava, eSewa, Mapbox, and AI variables are optional and only required for their
   corresponding integrations. Never commit real credentials.

3. Create the local database when using local PostgreSQL:

   ```bash
   createdb mtb_trail_finder
   ```

4. Apply migrations:

   ```bash
   pnpm db:migrate
   ```

5. Optionally seed collaboration data:

   ```bash
   pnpm db:seed
   ```

6. Start the web application:

   ```bash
   pnpm dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Android Navigator

The native project is documented in [mobile/README.md](mobile/README.md).

Run it independently from the mobile directory:

```bash
cd mobile
npm install
npm run android
```

MapLibre uses native code, so Expo Go is not supported. Development builds use Metro. A release
APK embeds the JavaScript bundle and does not require Metro, although map tiles and API-backed
features still require network access unless cached.

## Architecture

The complete dependency map and layer rules are in
[docs/architecture.md](docs/architecture.md).

The application follows these boundaries:

```text
Route composition  src/app/**
Presentation       src/components/**
Application state  src/hooks/** and src/stores/**
HTTP services      src/services/**
Domain utilities   src/lib/** and src/types/**
Server data access src/lib/data/** and server-only src/lib modules
API boundary       src/app/api/**
```

Dependencies flow downward. In particular:

- UI and application hooks never contain SQL or import the database client.
- API routes never import components, client hooks, or stores.
- Services own endpoint paths, payloads, response types, and transport errors.
- React Query and browser workflow orchestration belong in hooks.
- Route files compose features instead of implementing complete features inline.

The trails listing is the reference module for this structure:

```text
src/app/trails/trails-client.tsx
src/components/feature-components/trails/
src/hooks/trails/
src/services/trails/
```

The marketplace implementation is documented in
[docs/marketplace.md](docs/marketplace.md).

## Architecture Checks

Run the hard boundary check:

```bash
pnpm architecture:check
```

Report older UI files that still make direct HTTP calls and should be migrated into services:

```bash
pnpm architecture:report
```

The report is migration inventory, not a build failure. New client HTTP operations should be added
to `src/services/**`, not directly to route or presentation files.

## Project Structure

```text
.
├── database/
│   └── migrations/          PostgreSQL migrations
├── docs/
│   └── architecture.md      Dependency map and layer rules
├── mobile/                  Expo/React Native Android navigator
├── scripts/                 Migrations, seeds, smoke tests, architecture checks
└── src/
    ├── app/                 Next.js routes, layouts, and API endpoints
    ├── components/          Shared and feature presentation
    ├── hooks/               Client application orchestration
    ├── i18n/                English and Nepali copy
    ├── lib/                 Domain, server, and integration utilities
    ├── services/            Typed client HTTP contracts
    ├── stores/              Shared client state
    └── types/               Shared TypeScript types
```

## Common Commands

```bash
pnpm dev                  # Start Next.js development
pnpm build                # Create a production web build
pnpm start                # Run the production web build
pnpm test                 # Run Vitest
pnpm lint                 # Run ESLint
pnpm db:migrate           # Apply pending database migrations
pnpm db:seed              # Seed canonical development data
pnpm db:smoke             # Run database smoke checks
pnpm architecture:check  # Enforce hard layer boundaries
pnpm architecture:report # Show remaining direct-HTTP migration candidates
```

## Main Domains

The database and API support trails, route data, events, bookings, payments, participant requests,
guide verification, organizations, members, services, campaigns, ride programs, trail updates,
notifications, and navigation sessions. Database changes must be added as ordered migrations under
`database/migrations/`.
