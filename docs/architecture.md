# Application Architecture

## Dependency Map

```text
app routes
  -> components (presentation)
  -> hooks (application orchestration)

components
  -> hooks
  -> services (typed commands passed through hooks/controllers)
  -> lib/domain helpers

hooks
  -> services
  -> stores
  -> lib/domain helpers

services
  -> API endpoints
  -> shared types

API routes
  -> server/data modules
  -> domain helpers
  -> external integrations

server/data modules
  -> database
```

Dependencies move down this map. Lower layers must not import higher layers.

## Layer Ownership

### Route composition: `src/app/**`

- Defines Next.js routes, layouts, metadata, and server/client entry points.
- Composes feature views and providers.
- Route client files may coordinate feature hooks, but should not contain HTTP implementation or database access.
- API routes under `src/app/api/**` translate HTTP requests and responses. They must not render UI or import UI hooks/components.

### Presentation: `src/components/**`

- Renders UI from props and emits user intent through callbacks.
- May own local visual state such as an open disclosure or input draft.
- Must not contain SQL, import the database client, or implement endpoint serialization.

### Application: `src/hooks/**`, `src/stores/**`

- Coordinates queries, mutations, cache policy, browser lifecycle, and multi-step workflows.
- Calls typed service functions instead of constructing API requests inline.
- Must not contain SQL or import presentation components.

### Service: `src/services/**`

- Owns client-to-server HTTP contracts, endpoint paths, payloads, response types, and transport errors.
- Must not import React, route components, UI components, hooks, or stores.

### Domain and shared utilities: `src/lib/**`, `src/types/**`

- Contains pure domain rules, validation, formatting, and shared types.
- Server-only query modules live under `src/lib/data/**` or an explicitly server-only module.
- Generic utilities must not depend on presentation code.

### API and data access: `src/app/api/**`, `src/lib/data/**`, server-only `src/lib/**`

- SQL and database calls are allowed only in server-side data modules and API/application server modules.
- API routes validate input, call server/domain functions, and map results to HTTP responses.
- UI labels, JSX, modal state, and browser behavior never belong in this layer.

## Non-Negotiable Rules

1. Never write SQL or import `pg`/the database client in UI, hooks, stores, or client services.
2. Never import components, hooks, or stores from an API route.
3. Never import route modules or presentation modules from a service.
4. New client HTTP calls belong in `src/services/**`; React Query coordination belongs in `src/hooks/**`.
5. Feature-specific presentation belongs under `src/components/feature-components/<feature>`.
6. Route files should become composition roots, not feature implementations.

## Trails Reference Structure

The trails listing is the reference migration:

```text
src/app/trails/trails-client.tsx
  composition and interaction wiring

src/components/feature-components/trails/
  trails-page-header.tsx
  trails-filter-dialog.tsx
  trails-results.tsx
  trails-page-dialogs.tsx
  trails-map-preview.tsx

src/hooks/trails/
  use-trails-filters.ts
  use-trails-page-data.ts
  use-trails-page-lifecycle.ts
  use-trails-map-style.ts

src/services/trails/
  trails.service.ts
  trails-page.service.ts
```

## Migration Order

Move legacy features in this order:

1. Large route clients with direct HTTP calls.
2. Admin panels with mixed transport and presentation logic.
3. Organization management panels.
4. Small account, navigation, and feedback components.

Run `npm run architecture:check` for hard boundary violations and
`npm run architecture:report` to list remaining direct client HTTP calls.
