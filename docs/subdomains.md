# LocoXperts subdomains

The main web app serves both experiences. The root URL on each subdomain opens its
corresponding section while leaving the URL on that subdomain:

- `services.locoxperts.com/` rewrites to `/services`.
- `trails.locoxperts.com/` rewrites to `/trails`.
- Other paths continue to use the existing app routes.

## Hosting setup

Add both hostnames to the same production hosting project that serves
`locoxperts.com`. They have been added to the `locoxperts` Production project in
Vercel and show **Valid Configuration**. Since the domain uses Vercel
nameservers, Vercel creates the first-level subdomain DNS records automatically.
Namecheap remains the registrar; no Namecheap DNS change is needed. Vercel also
handles TLS certificates for the configured project domains.

## OAuth setup

Google OAuth returns to the same LocoXperts hostname that started sign-in, so
its host-only OAuth state cookie is available at the callback. Both URLs have
been added to the active Google OAuth client's authorized redirect URIs:

- `https://services.locoxperts.com/api/auth/google/callback`
- `https://trails.locoxperts.com/api/auth/google/callback`

The configured Strava callback is still on `locoxperts.com`; Strava
sign-in/connect flows should stay on the main domain until its callback handling
and provider configuration are updated for the subdomains.
