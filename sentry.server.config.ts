import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1,
    beforeSend(event: Sentry.ErrorEvent) {
      // 1. Scrub Authorization headers, Cookies, and sensitive request data
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-webhook-secret'];
        delete event.request.headers['x-pathao-signature'];
      }

      // 2. Scrub sensitive environment variables or credentials in error contexts
      if (event.extra) {
        const sensitiveKeys = ['apiKey', 'secretKey', 'encrypted_api_key', 'encrypted_api_secret', 'password', 'token', 'ENCRYPTION_KEY'];
        for (const key of Object.keys(event.extra)) {
          if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
            event.extra[key] = '[REDACTED]';
          }
        }
      }

      // 3. Scrub customer PII (phone numbers, full addresses) in breadcrumbs
      if (event.breadcrumbs) {
        for (const breadcrumb of event.breadcrumbs) {
          if (breadcrumb.data && typeof breadcrumb.data === 'object') {
            for (const key of Object.keys(breadcrumb.data)) {
              if (['customer_phone', 'customer_address', 'phone', 'address'].includes(key.toLowerCase())) {
                breadcrumb.data[key] = '[REDACTED_PII]';
              }
            }
          }
        }
      }

      return event;
    },
  });
}
