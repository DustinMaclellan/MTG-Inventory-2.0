export const TRIAL_DAYS = 14;
export const PLAN_NAME = "Mystic Ledger Pro";
export const PLAN_MONTHLY_USD = 8;
export const PLAN_YEARLY_USD = 72;
export const SESSION_COOKIE = "mystic_session";
export const LOCALE_COOKIE = "mystic_locale";

export function trialEndsAtFrom(now = new Date()) {
  return new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}
