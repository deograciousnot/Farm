/** Topics a farmer can file a community question under. Keep in step with seeded thread categories. */
export const COMMUNITY_TOPICS = [
  'Crop care',
  'Livestock',
  'Farm inputs',
  'Pricing',
  'Market access',
  'Trade trust',
  'Cold chain',
] as const;

// Must match the feed filter chips in server/controllers/feed.controller.js so tagged posts show up under filters.
export const POST_TAGS = ['Field note', 'Crop health', 'Market tea', 'Farm inputs', 'Buyer demand', 'Greenhouse hacks'] as const;

export const LISTING_CATEGORIES = ['Vegetables', 'Fruits', 'Grains', 'Dairy', 'Fish', 'Farm inputs'] as const;
