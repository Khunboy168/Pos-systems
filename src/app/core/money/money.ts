// All USD amounts are integer cents. All KHR amounts are integer riel.
export const KHR_STEP = 100; // smallest note in circulation in Cambodia

export function roundKhr(riel: number, step = KHR_STEP): number {
  return Math.round(riel / step) * step;
}

export function usdToKhr(cents: number, rate: number): number {
  return roundKhr((cents * rate) / 100);
}

/** VAT contained in a VAT-inclusive total. */
export function vatFromInclusive(totalCents: number, vatPct: number): number {
  return Math.round(totalCents - totalCents / (1 + vatPct / 100));
}

export interface ChangeResult {
  shortCents: number;   // > 0 means customer has not paid enough
  changeUsd: number;    // whole dollars to give back
  changeKhr: number;    // riel to give back, rounded to 100
}

/** Customer may pay USD + KHR together. Change = whole dollars in USD, remainder in KHR. */
export function calcChange(totalCents: number, paidUsdCents: number, paidKhr: number, rate: number): ChangeResult {
  const paidCents = paidUsdCents + Math.round((paidKhr * 100) / rate);
  const diff = paidCents - totalCents;
  if (diff < 0) return { shortCents: -diff, changeUsd: 0, changeKhr: 0 };
  const changeUsd = Math.floor(diff / 100);
  const changeKhr = roundKhr(((diff % 100) * rate) / 100);
  return { shortCents: 0, changeUsd, changeKhr };
}
