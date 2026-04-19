export type Product = {
  id: string;
  name: string;
  farmer: string;
  location: string;
  category: string;
  description: string;
  unit: string;
  price: number;
  stock: number;
};

export type FeedPost = {
  id: string;
  author: string;
  role: 'Farmer' | 'Buyer' | 'Hobbyist' | 'Extension officer';
  location: string;
  headline: string;
  body: string;
  likes: number;
  comments: number;
  tag: string;
};

export type CommunityThread = {
  id: string;
  title: string;
  author: string;
  role: string;
  replies: number;
  category: string;
  preview: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  type: 'order' | 'community' | 'system';
  time: string;
};

export const dashboardHighlights = [
  { label: 'Verified growers', value: '128', color: '#1f8f55' },
  { label: 'Sponsored slots live', value: '12', color: '#ef5b4c' },
  { label: 'Market stories trending', value: '31', color: '#f5a623' },
  { label: 'Counties active', value: '19', color: '#d33f49' },
];

export const feedPosts: FeedPost[] = [
  {
    id: 'feed-1',
    author: 'Mary Wanjiru',
    role: 'Farmer',
    location: 'Nyeri',
    headline: 'Tomato blight alert after two days of rain in Tetu',
    body: 'I spotted early blight on one greenhouse block this morning. I switched to targeted spraying and improved ventilation. Sharing so growers near Nyeri can inspect early before it spreads.',
    likes: 84,
    comments: 19,
    tag: 'Crop health',
  },
  {
    id: 'feed-2',
    author: 'FarmConnect Market Desk',
    role: 'Buyer',
    location: 'Nairobi',
    headline: 'Naivas and hotel buyers are asking for cleaner avocado grading this weekend',
    body: 'Demand is up for medium-size avocados and red onions. Sellers posting ready stock with sorted grades, clean packaging, and transport timing are getting faster responses.',
    likes: 126,
    comments: 24,
    tag: 'Market tea',
  },
  {
    id: 'feed-3',
    author: 'Peter Mwangi',
    role: 'Hobbyist',
    location: 'Kiambu',
    headline: 'My low-cost kitchen garden drip setup finally stopped wasting water',
    body: 'I built a gravity-fed drip line from a raised drum and basic tubing. If FarmConnect adds a hobbyist track, this kind of small-garden content could still attract buyers for inputs and seedlings.',
    likes: 59,
    comments: 26,
    tag: 'DIY growing',
  },
  {
    id: 'feed-4',
    author: 'AgriNova Inputs',
    role: 'Buyer',
    location: 'Nakuru',
    headline: 'Sponsored: foliar feed bundle for capsicum and tomatoes now shipping to Central Kenya',
    body: 'This is the kind of sponsored post that should live naturally in the feed, clearly labeled but useful. Product education, pricing, and farmer reviews matter more than loud ads.',
    likes: 33,
    comments: 11,
    tag: 'Sponsored',
  },
];

export const produceCatalog: Product[] = [
  {
    id: 'roma-tomatoes',
    name: 'Roma Tomatoes',
    farmer: 'Kamau Fresh Farms',
    location: 'Nyeri',
    category: 'Vegetables',
    description: 'Firm, bright tomatoes packed for groceries, restaurants, and estate deliveries.',
    unit: 'kg',
    price: 95,
    stock: 140,
  },
  {
    id: 'hass-avocados',
    name: 'Hass Avocados',
    farmer: 'Highland Orchards',
    location: "Murang'a",
    category: 'Fruits',
    description: 'Creamy, export-grade avocados sorted by size and ready for Nairobi dispatch.',
    unit: 'piece',
    price: 28,
    stock: 620,
  },
  {
    id: 'dry-maize',
    name: 'Dry Maize',
    farmer: 'Rift Valley Growers',
    location: 'Eldoret',
    category: 'Grains',
    description: 'Clean, well-dried maize suitable for wholesale buyers, schools, and millers.',
    unit: 'kg',
    price: 62,
    stock: 980,
  },
  {
    id: 'rainbow-peppers',
    name: 'Rainbow Peppers',
    farmer: 'Green Basket Co-op',
    location: 'Naivasha',
    category: 'Vegetables',
    description: 'Mixed red, yellow, and green peppers with greenhouse consistency and bright finish.',
    unit: 'kg',
    price: 180,
    stock: 88,
  },
];

export const featuredFarmers = [
  {
    id: 'farmer-1',
    name: 'Kamau Fresh Farms',
    location: 'Nyeri',
    speciality: 'Vegetables',
    status: 'Verified',
    description: 'Smallholder network specializing in tomatoes, onions, and leafy greens for urban buyers.',
  },
  {
    id: 'farmer-2',
    name: 'Highland Orchards',
    location: "Murang'a",
    speciality: 'Avocados & mangoes',
    status: 'Top rated',
    description: 'Fruit supplier with grading, sorting, and cold-chain coordination already in place.',
  },
];

export const communityThreads: CommunityThread[] = [
  {
    id: 'thread-1',
    title: 'What is the best way to price onions after harvest if Wakulima prices keep moving?',
    author: 'Grace Njeri',
    role: 'Farmer',
    replies: 18,
    category: 'Pricing',
    preview: 'I have storage for one week only. Should I release immediately, wait for Monday, or split across Gikomba and local buyers?',
  },
  {
    id: 'thread-2',
    title: 'Any low-cost organic pest control for sukuma wiki that actually works in rainy weather?',
    author: 'Ken the Grower',
    role: 'Hobbyist',
    replies: 25,
    category: 'Crop care',
    preview: 'I am seeing aphids again and want something safer before they spread across the beds. Neem worked a bit, but I need a stronger routine.',
  },
  {
    id: 'thread-3',
    title: 'How should buyers verify quality before dispatch without creating friction for farmers?',
    author: 'Asha Foods',
    role: 'Buyer',
    replies: 11,
    category: 'Trade trust',
    preview: 'We want a repeatable checklist that farmers can follow before sending stock to city hubs so rejections reduce for both sides.',
  },
];

export const notificationPreview: NotificationItem[] = [
  {
    id: 'note-1',
    title: 'Order update',
    body: 'ORDER-1001 moved to in transit and the rider has left the collection hub in Nyeri.',
    type: 'order',
    time: '8m ago',
  },
  {
    id: 'note-2',
    title: 'Community is moving',
    body: 'Three growers responded to your irrigation setup question and one buyer saved your thread.',
    type: 'community',
    time: '35m ago',
  },
  {
    id: 'note-3',
    title: 'Trust score boost',
    body: 'Add delivery proof and recent produce photos to improve listing performance and buyer confidence.',
    type: 'system',
    time: '2h ago',
  },
];

export const orderHistory = [
  {
    id: 'ORDER-1001',
    supplier: 'Kamau Fresh Farms',
    total: 8450,
    status: 'In transit',
    items: 3,
    eta: 'Apr 18',
    note: 'Driver confirmed pickup and is on the way to the city hub.',
  },
  {
    id: 'ORDER-1002',
    supplier: 'Highland Orchards',
    total: 3620,
    status: 'Accepted',
    items: 2,
    eta: 'Apr 19',
    note: 'Packing team accepted the order and started sorting avocados for dispatch.',
  },
  {
    id: 'ORDER-0998',
    supplier: 'Rift Valley Growers',
    total: 11800,
    status: 'Delivered',
    items: 4,
    eta: 'Apr 12',
    note: 'Bulk maize order delivered successfully and marked complete.',
  },
];

export const sellerMetrics = [
  { label: 'Reputation score', value: '4.8/5', color: '#1f8f55' },
  { label: 'Completed orders', value: '126', color: '#ef5b4c' },
  { label: 'Community posts', value: '43', color: '#f5a623' },
  { label: 'Repeat buyers', value: '27', color: '#d33f49' },
];

export const profileActions = [
  {
    title: 'Manage identity and trust',
    description: 'Update verification, profile details, and delivery proof that improves buyer confidence.',
  },
  {
    title: 'Publish posts and listings',
    description: 'Share farm updates, answer community questions, and create produce listings from one profile.',
  },
  {
    title: 'Track transactions',
    description: 'Review order performance, delivery history, and future payout activity in one place.',
  },
];

export const userProfile = {
  name: 'Kamau Fresh Farms',
  role: 'Farmer seller',
  location: 'Nyeri County',
  phone: '+254 700 000 000',
  bio: 'Grower-first storefront for produce sales, reputation, and community knowledge sharing across Kenya.',
  reputation: '4.8 trusted seller rating',
  posts: 43,
  listings: 18,
  successfulOrders: 126,
};

export const categoryFilters = [
  'All produce',
  'Vegetables',
  'Fruits',
  'Grains',
  'Farm inputs',
  'Wholesale',
];
