import * as Sentry from "@sentry/browser";

declare const __GIT_HASH__: string;

const IS_LOCAL =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

export function initMetrics() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    release: __GIT_HASH__,
    environment: IS_LOCAL ? "local" : import.meta.env.DEV ? "development" : "production",
  });
}

export function trackRoundStart(round: number) {
  if (!Sentry.getClient()) return;
  Sentry.metrics.count("game.round_start", 1, { attributes: { round: String(round) } });
}

export function trackRoundWon(round: number) {
  if (!Sentry.getClient()) return;
  Sentry.metrics.count("game.round_won", 1, { attributes: { round: String(round) } });
}

export function trackRunWon() {
  if (!Sentry.getClient()) return;
  Sentry.metrics.count("game.run_won", 1);
}

export function trackRunOver(round: number) {
  if (!Sentry.getClient()) return;
  Sentry.metrics.count("game.run_over", 1, { attributes: { round: String(round) } });
}

export function trackJokerPicked(jokerId: string) {
  if (!Sentry.getClient()) return;
  Sentry.metrics.count("game.joker_picked", 1, { attributes: { joker: jokerId } });
}
