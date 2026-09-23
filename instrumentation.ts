export async function register() {
  // Sentry ne s'active que si SENTRY_DSN est configuré (compte sentry.io
  // gratuit suffit). Sans DSN : no-op complet, zéro impact.
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError =
  process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
    ? async (...args: unknown[]) => {
        const Sentry = await import("@sentry/nextjs");
        // @ts-expect-error signature imposée par Next 15
        return Sentry.captureRequestError(...args);
      }
    : undefined;
