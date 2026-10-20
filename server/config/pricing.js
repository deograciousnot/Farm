/**
 * What FarmConnect sells, in KES. Change prices here; the app and the partner dashboard read them
 * from /api/payments/plans.
 */

/** A seller pays to put a listing at the top of the market and in the Home feed for a while. */
export const LISTING_BOOSTS = {
  "boost-3d": { label: "3 days", days: 3, amount: 50 },
  "boost-7d": { label: "1 week", days: 7, amount: 100 },
  "boost-30d": { label: "1 month", days: 30, amount: 300 },
};

/** A company buys credits; each sponsored update it submits uses one (returned if FarmConnect sends it back). */
export const SPONSORED_PACKS = {
  "sponsored-1": { label: "1 sponsored update", credits: 1, amount: 5000 },
  "sponsored-5": { label: "5 sponsored updates", credits: 5, amount: 20000 },
};
