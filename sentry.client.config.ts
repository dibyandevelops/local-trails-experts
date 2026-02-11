import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: "https://aedef5d990469c3b0772d9b5c3a589a0@o4510865812750336.ingest.us.sentry.io/4510865817796608",
  tracesSampleRate: 0.1,
});
