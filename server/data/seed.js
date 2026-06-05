import { connectToDatabase, disconnectFromDatabase } from "../config/db.js";
import { validateEnv } from "../config/env.js";
import { CommunityThread } from "../models/community-thread.model.js";
import { Comment } from "../models/comment.model.js";
import { LikedPost } from "../models/liked-post.model.js";
import { Notification } from "../models/notification.model.js";
import { Order } from "../models/order.model.js";
import { Post } from "../models/post.model.js";
import { Product } from "../models/product.model.js";
import { SavedPost } from "../models/saved-post.model.js";
import { SellerRemark } from "../models/seller-remark.model.js";
import { ThreadReply } from "../models/thread-reply.model.js";
import { User } from "../models/user.model.js";

async function findOrCreateMany(Model, records, getFilter) {
  const savedRecords = [];

  for (const record of records) {
    const existingRecord = await Model.findOne(getFilter(record));
    savedRecords.push(existingRecord || (await Model.create(record)));
  }

  return savedRecords;
}

async function resetDatabase() {
  await Promise.all([
    Notification.deleteMany({}),
    SavedPost.deleteMany({}),
    SellerRemark.deleteMany({}),
    LikedPost.deleteMany({}),
    Comment.deleteMany({}),
    Order.deleteMany({}),
    CommunityThread.deleteMany({}),
    ThreadReply.deleteMany({}),
    Post.deleteMany({}),
    Product.deleteMany({}),
    User.deleteMany({}),
  ]);
}

export async function seedDatabase({ reset = false } = {}) {
  if (reset) {
    await resetDatabase();
  }

  const [buyer, farmer, hobbyist, hotelBuyer, dairyFarmer, inputSupplier, fishFarmer, youthFarmer] =
    await findOrCreateMany(User, [
    {
      name: "Amina Njeri",
      email: "amina@farmconnect.app",
      password: "password123",
      role: "buyer",
      location: "Nairobi",
      interests: ["Market tea", "Buyer demand", "Trusted suppliers"],
      bio: "Urban produce buyer focused on consistent quality, fast delivery, and repeat suppliers.",
      phone: "+254700111111",
      avatarUrl: "https://i.pravatar.cc/150?img=32",
      verificationStatus: "verified",
      trustScore: 4.4,
    },
    {
      name: "Kamau Fresh Farms",
      email: "kamau@farmconnect.app",
      password: "password123",
      role: "farmer",
      location: "Nyeri",
      interests: ["Crop health", "Wholesale", "Vegetables"],
      bio: "Grower-first storefront for produce sales, trust building, and community knowledge sharing.",
      phone: "+254700222222",
      avatarUrl: "https://i.pravatar.cc/150?img=12",
      verificationStatus: "top-rated",
      trustScore: 4.8,
    },
    {
      name: "Peter Mwangi",
      email: "peter@farmconnect.app",
      password: "password123",
      role: "hobbyist",
      location: "Kiambu",
      interests: ["Kitchen gardening", "DIY irrigation", "Farm inputs"],
      bio: "Small-space grower learning from the community and shopping like a buyer.",
      phone: "+254700333333",
      avatarUrl: "https://i.pravatar.cc/150?img=14",
      verificationStatus: "unverified",
      trustScore: 3.6,
    },
    {
      name: "Wanjiku Hotel Supplies",
      email: "wanjiku@farmconnect.app",
      password: "password123",
      role: "buyer",
      location: "Westlands, Nairobi",
      interests: ["Bulk vegetables", "Same-day delivery", "Quality grading"],
      bio: "Procurement lead buying fresh produce for hotels, cafes, and small caterers around Westlands and Kilimani.",
      phone: "+254711444555",
      avatarUrl: "https://i.pravatar.cc/150?img=47",
      verificationStatus: "verified",
      trustScore: 4.6,
    },
    {
      name: "Lemook Dairy Cooperative",
      email: "lemook@farmconnect.app",
      password: "password123",
      role: "farmer",
      location: "Njoro, Nakuru",
      interests: ["Dairy feeds", "Silage", "Cooperative sales"],
      bio: "Small dairy cooperative sharing practical feed planning, milk quality notes, and cooperative buying lessons.",
      phone: "+254722555666",
      avatarUrl: "https://i.pravatar.cc/150?img=52",
      verificationStatus: "top-rated",
      trustScore: 4.9,
    },
    {
      name: "AgriVet East Africa",
      email: "agrivet@farmconnect.app",
      password: "password123",
      role: "farmer",
      location: "Thika",
      interests: ["Farm inputs", "Soil testing", "Extension support"],
      bio: "Input supplier posting verified farm inputs, soil amendment tips, and safe application reminders.",
      phone: "+254733666777",
      avatarUrl: "https://i.pravatar.cc/150?img=56",
      verificationStatus: "verified",
      trustScore: 4.2,
    },
    {
      name: "Ahero Fresh Fish Farm",
      email: "ahero@farmconnect.app",
      password: "password123",
      role: "farmer",
      location: "Ahero, Kisumu",
      interests: ["Aquaculture", "Cold chain", "Restaurant supply"],
      bio: "Tilapia producer serving Kisumu, Kericho, and Nairobi buyers with packed, iced fish on dispatch days.",
      phone: "+254744777888",
      avatarUrl: "https://i.pravatar.cc/150?img=59",
      verificationStatus: "verified",
      trustScore: 4.5,
    },
    {
      name: "Brian Kiptoo",
      email: "brian@farmconnect.app",
      password: "password123",
      role: "hobbyist",
      location: "Eldoret",
      interests: ["Youth agribusiness", "Potatoes", "Market prices"],
      bio: "Young grower documenting potato trials, broker negotiations, and small farm bookkeeping lessons.",
      phone: "+254755888999",
      avatarUrl: "https://i.pravatar.cc/150?img=60",
      verificationStatus: "unverified",
      trustScore: 3.9,
    },
    ], ({ email }) => ({ email }));

  await Promise.all([
    User.updateOne(
      { _id: buyer._id },
      { $addToSet: { following: { $each: [farmer._id, hotelBuyer._id, fishFarmer._id] } } }
    ),
    User.updateOne(
      { _id: farmer._id },
      {
        $addToSet: {
          followers: { $each: [buyer._id, hobbyist._id] },
          following: { $each: [dairyFarmer._id] },
        },
      }
    ),
    User.updateOne(
      { _id: hotelBuyer._id },
      { $addToSet: { following: { $each: [farmer._id, youthFarmer._id, fishFarmer._id] } } }
    ),
    User.updateOne(
      { _id: youthFarmer._id },
      {
        $addToSet: {
          followers: { $each: [hotelBuyer._id] },
          following: { $each: [farmer._id, inputSupplier._id] },
        },
      }
    ),
  ]);

  const products = await findOrCreateMany(Product, [
    {
      seller: farmer._id,
      name: "Roma Tomatoes",
      category: "Vegetables",
      description: "Firm, bright tomatoes packed for groceries, restaurants, and estate deliveries.",
      unit: "kg",
      price: 95,
      stock: 140,
      location: "Nyeri",
      sellerType: "farmer",
      isOrganic: true,
      featured: true,
    },
    {
      seller: farmer._id,
      name: "Rainbow Peppers",
      category: "Vegetables",
      description: "Mixed red, yellow, and green peppers with greenhouse consistency and bright finish.",
      unit: "kg",
      price: 180,
      stock: 88,
      location: "Naivasha",
      sellerType: "farmer",
      featured: true,
    },
    {
      seller: farmer._id,
      name: "Dry Maize",
      category: "Grains",
      description: "Clean, well-dried maize suitable for wholesale buyers, schools, and millers.",
      unit: "kg",
      price: 62,
      stock: 980,
      location: "Eldoret",
      sellerType: "farmer",
    },
    {
      seller: youthFarmer._id,
      name: "Shangi Potatoes",
      category: "Vegetables",
      description: "Sorted medium-size Shangi potatoes packed in 50kg bags for chips vendors and estate groceries.",
      unit: "50kg bag",
      price: 3200,
      stock: 42,
      location: "Molo",
      sellerType: "farmer",
      featured: true,
      mediaUrls: ["https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=1200&q=80"],
    },
    {
      seller: farmer._id,
      name: "Hass Avocados",
      category: "Fruits",
      description: "Export-grade Hass avocados, size-count sorted with firm fruit for Nairobi buyers and aggregators.",
      unit: "crate",
      price: 1850,
      stock: 65,
      location: "Muranga",
      sellerType: "farmer",
      isOrganic: true,
      featured: true,
      mediaUrls: ["https://images.unsplash.com/photo-1601039641847-7857b994d704?auto=format&fit=crop&w=1200&q=80"],
    },
    {
      seller: dairyFarmer._id,
      name: "Boma Rhodes Hay",
      category: "Farm inputs",
      description: "Dry Boma Rhodes hay bales from Njoro, suitable for dairy cows during short dry spells.",
      unit: "bale",
      price: 320,
      stock: 180,
      location: "Njoro",
      sellerType: "farmer",
      mediaUrls: ["https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80"],
    },
    {
      seller: inputSupplier._id,
      name: "Soil Test Kit",
      category: "Farm inputs",
      description: "Basic pH and nutrient screening kit for small farms planning lime, manure, and fertilizer use.",
      unit: "kit",
      price: 1450,
      stock: 27,
      location: "Thika",
      sellerType: "input-company",
      featured: true,
    },
    {
      seller: inputSupplier._id,
      name: "Certified Sukuma Wiki Seeds",
      category: "Farm inputs",
      description: "Certified kale seed packets for kitchen gardens, schools, and small commercial plots.",
      unit: "packet",
      price: 180,
      stock: 240,
      location: "Thika",
      sellerType: "input-company",
    },
    {
      seller: fishFarmer._id,
      name: "Fresh Whole Tilapia",
      category: "Fish",
      description: "Iced whole tilapia packed on dispatch morning for restaurants, fish shops, and family orders.",
      unit: "kg",
      price: 520,
      stock: 75,
      location: "Kisumu",
      sellerType: "farmer",
      featured: true,
      mediaUrls: ["https://images.unsplash.com/photo-1534766555764-ce878a5e3a2b?auto=format&fit=crop&w=1200&q=80"],
    },
    {
      seller: farmer._id,
      name: "Red Bulb Onions",
      category: "Vegetables",
      description: "Cured red onions in net bags, dry necks, low sprouting, ready for estate shops and hotel kitchens.",
      unit: "13kg net",
      price: 1150,
      stock: 90,
      location: "Kajiado",
      sellerType: "farmer",
      mediaUrls: ["https://images.unsplash.com/photo-1587049633312-d628ae50a8ae?auto=format&fit=crop&w=1200&q=80"],
    },
    {
      seller: dairyFarmer._id,
      name: "Fresh Morning Milk",
      category: "Dairy",
      description: "Chilled cooperative milk available for local buyers with morning collection in Njoro.",
      unit: "litre",
      price: 68,
      stock: 310,
      location: "Nakuru",
      sellerType: "farmer",
    },
  ], ({ seller, name }) => ({ seller, name }));

  const posts = await findOrCreateMany(Post, [
    {
      author: farmer._id,
      postType: "knowledge",
      headline: "Tomato blight alert after two days of rain in Tetu",
      body: "I spotted early blight on one greenhouse block this morning. Sharing early so nearby growers can inspect before it spreads.",
      tag: "Crop health",
      location: "Nyeri",
      likesCount: 84,
      commentsCount: 19,
      savesCount: 12,
    },
    {
      author: buyer._id,
      postType: "market",
      headline: "Naivas and hotel buyers are asking for cleaner avocado grading this weekend",
      body: "Demand is up for medium-size avocados and red onions. Sellers with sorted grades and clear transport timing are getting faster responses.",
      tag: "Market tea",
      location: "Nairobi",
      likesCount: 126,
      commentsCount: 24,
      savesCount: 31,
    },
    {
      author: hobbyist._id,
      postType: "knowledge",
      headline: "My low-cost kitchen garden drip setup finally stopped wasting water",
      body: "Built a gravity-fed drip line from a raised drum and basic tubing. It is simple, cheap, and good enough for a backyard setup.",
      tag: "DIY growing",
      location: "Kiambu",
      likesCount: 59,
      commentsCount: 26,
      savesCount: 18,
      media: [
        {
          type: "video",
          url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
        },
      ],
    },
    {
      author: buyer._id,
      postType: "sponsored",
      headline: "Sponsored: foliar feed bundle for capsicum and tomatoes now shipping to Central Kenya",
      body: "Clear labeling matters. Sponsored content should still be useful, educational, and close to buyer needs instead of feeling spammy.",
      tag: "Sponsored",
      location: "Nakuru",
      likesCount: 33,
      commentsCount: 11,
      savesCount: 5,
      isSponsored: true,
    },
    {
      author: buyer._id,
      postType: "market",
      headline: "Tomato buyers are changing how they order after the long-rains squeeze",
      body:
        "Tomato supply has been tight across several urban routes this week, especially where heavy rains have slowed harvests and damaged fruit before it reaches the crate.\n\nFor small hotels and estate vendors, the issue is no longer just price. They are asking sellers to separate firm tomatoes from soft ones, confirm dispatch time before payment, and avoid mixing rain-damaged fruit into the same crate.\n\nMy takeaway for farmers: if you have clean tomatoes, do not only post the price. Post the grade, crate weight, pickup window, and whether the fruit can survive same-day transport. Buyers are responding faster to clarity than to vague cheap offers.",
      tag: "Market signal",
      location: "Nairobi",
      likesCount: 142,
      commentsCount: 31,
      savesCount: 47,
      media: [
        {
          type: "image",
          url: "https://images.unsplash.com/photo-1592841200221-a6898f307baa?auto=format&fit=crop&w=1200&q=80",
        },
      ],
      bodyBlocks: [
        {
          type: "paragraph",
          text: "Tomato supply has been tight across several urban routes this week, especially where heavy rains have slowed harvests and damaged fruit before it reaches the crate. The price conversation is getting loud, but the real issue I am seeing is trust at handover: buyers want to know whether the crate can survive the road, not just whether the number sounds fair.",
        },
        {
          type: "image",
          url: "https://images.unsplash.com/photo-1592841200221-a6898f307baa?auto=format&fit=crop&w=1200&q=80",
          mediaIndex: 0,
        },
        {
          type: "paragraph",
          text: "For small hotels and estate vendors, the issue is no longer just price. They are asking sellers to separate firm tomatoes from soft ones, confirm dispatch time before payment, and avoid mixing rain-damaged fruit into the same crate. A buyer who receives one bad crate today may not come back next week, even if the shortage continues.",
        },
        {
          type: "paragraph",
          text: "My takeaway for farmers: if you have clean tomatoes, do not only post the price. Post the grade, crate weight, pickup window, and whether the fruit can survive same-day transport. Buyers are responding faster to clarity than to vague cheap offers.",
        },
      ],
    },
    {
      author: farmer._id,
      postType: "market",
      headline: "Dry maize is available, but the spread between markets is doing the real talking",
      body:
        "The dry maize conversation is not one national price. Some towns are showing steady stock, while other markets are rewarding sellers who can move clean grain to stronger demand points.\n\nBefore sending a 90kg bag anywhere, I now check three things: the local buyer price, the transport cost per bag, and whether payment is immediate. A higher headline price can disappear quickly if the buyer delays payment or rejects moisture levels at the store.\n\nFarmConnect could be very useful here if farmers keep posting actual market reads: where they sold, what grade was accepted, and what deductions were made after weighing.",
      tag: "Maize watch",
      location: "Eldoret",
      likesCount: 98,
      commentsCount: 22,
      savesCount: 39,
      media: [
        {
          type: "image",
          url: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=1200&q=80",
        },
      ],
      bodyBlocks: [
        {
          type: "paragraph",
          text: "The dry maize conversation is not one national price. Some towns are showing steady stock, while other markets are rewarding sellers who can move clean grain to stronger demand points. That spread matters because the best decision may not be selling immediately at the nearest store.",
        },
        {
          type: "paragraph",
          text: "Before sending a 90kg bag anywhere, I now check three things: the local buyer price, the transport cost per bag, and whether payment is immediate. A higher headline price can disappear quickly if the buyer delays payment, rejects moisture levels at the store, or applies deductions that were not discussed before loading.",
        },
        {
          type: "image",
          url: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=1200&q=80",
          mediaIndex: 0,
        },
        {
          type: "paragraph",
          text: "FarmConnect could be very useful here if farmers keep posting actual market reads: where they sold, what grade was accepted, and what deductions were made after weighing. That is more useful than a single price screenshot because it tells the next farmer how the trade actually behaved.",
        },
      ],
    },
    {
      author: farmer._id,
      postType: "knowledge",
      headline: "Rainy-week tomato handling: the small sorting step that saves the buyer relationship",
      body:
        "When tomatoes are harvested after wet days, the temptation is to push everything into the crate and move quickly. That works once, then the buyer remembers your name for the wrong reason.\n\nWe started doing a three-way sort: firm table tomatoes, slightly soft tomatoes for immediate kitchen use, and damaged fruit that never enters the buyer crate. It slows packing by a few minutes, but complaints have gone down.\n\nIf you are selling during this shortage, protect your next order. The buyer may accept higher prices this week, but they will still remember whether your crate arrived honestly packed.",
      tag: "Field note",
      location: "Nyeri",
      likesCount: 121,
      commentsCount: 28,
      savesCount: 55,
      media: [
        {
          type: "video",
          url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
        },
      ],
      bodyBlocks: [
        {
          type: "paragraph",
          text: "When tomatoes are harvested after wet days, the temptation is to push everything into the crate and move quickly. That works once, then the buyer remembers your name for the wrong reason. Rain makes small bruises harder to notice, and those bruises become the first complaint when the crate reaches town.",
        },
        {
          type: "video",
          url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
          mediaIndex: 0,
        },
        {
          type: "paragraph",
          text: "We started doing a three-way sort: firm table tomatoes, slightly soft tomatoes for immediate kitchen use, and damaged fruit that never enters the buyer crate. It slows packing by a few minutes, but complaints have gone down because every buyer knows exactly what grade they are paying for.",
        },
        {
          type: "paragraph",
          text: "If you are selling during this shortage, protect your next order. The buyer may accept higher prices this week, but they will still remember whether your crate arrived honestly packed. In a market like this, reputation is also part of the price.",
        },
      ],
    },
    {
      author: buyer._id,
      postType: "market",
      headline: "What Nairobi buyers want in onions and potatoes before committing to bulk orders",
      body:
        "Bulk buyers are asking fewer emotional questions and more practical ones: how dry are the onions, how uniform are the potatoes, and can the seller deliver the same quality twice?\n\nFor onions, buyers are watching curing and storage. Wet bags create losses fast, especially when transport is delayed. For potatoes, size consistency matters because restaurants and chips vendors hate paying premium rates for mixed grades.\n\nIf you are posting listings, add one close photo of the bag or crate, one photo of the sorted produce, and a short note on when it was harvested. That is enough to reduce back-and-forth and move the conversation toward price.",
      tag: "Buyer demand",
      location: "Nairobi",
      likesCount: 87,
      commentsCount: 17,
      savesCount: 33,
      media: [
        {
          type: "image",
          url: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=1200&q=80",
        },
      ],
      bodyBlocks: [
        {
          type: "paragraph",
          text: "Bulk buyers are asking fewer emotional questions and more practical ones: how dry are the onions, how uniform are the potatoes, and can the seller deliver the same quality twice? The buyer may sound difficult, but most of these questions come from previous losses after receiving mixed grades.",
        },
        {
          type: "image",
          url: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=1200&q=80",
          mediaIndex: 0,
        },
        {
          type: "paragraph",
          text: "For onions, buyers are watching curing and storage. Wet bags create losses fast, especially when transport is delayed. For potatoes, size consistency matters because restaurants and chips vendors hate paying premium rates for mixed grades that force them to spend more time sorting.",
        },
        {
          type: "paragraph",
          text: "If you are posting listings, add one close photo of the bag or crate, one photo of the sorted produce, and a short note on when it was harvested. That is enough to reduce back-and-forth and move the conversation toward price.",
        },
      ],
    },
    {
      author: hobbyist._id,
      postType: "knowledge",
      headline: "Why market posts should read like field journals, not just price alerts",
      body:
        "A price alone is useful for a few minutes. A field note stays useful longer because it explains what caused the price, what quality was accepted, and what the seller learned.\n\nFor example, saying tomatoes are expensive is helpful. Saying rains reduced supply, buyers are rejecting soft fruit, and clean crates are moving faster gives farmers something they can act on.\n\nThat is the kind of content I want to save on FarmConnect: not perfect articles, just honest market notes that help the next person make a better decision.",
      tag: "Community insight",
      location: "Kiambu",
      likesCount: 64,
      commentsCount: 14,
      savesCount: 26,
      bodyBlocks: [
        {
          type: "paragraph",
          text: "A price alone is useful for a few minutes. A field note stays useful longer because it explains what caused the price, what quality was accepted, and what the seller learned. That is the difference between noise and knowledge in an agriculture feed.",
        },
        {
          type: "paragraph",
          text: "For example, saying tomatoes are expensive is helpful. Saying rains reduced supply, buyers are rejecting soft fruit, and clean crates are moving faster gives farmers something they can act on. It also helps buyers understand why a seller is asking for a better price instead of assuming everyone is guessing.",
        },
        {
          type: "paragraph",
          text: "That is the kind of content I want to save on FarmConnect: not perfect articles, just honest market notes that help the next person make a better decision. If the feed keeps rewarding practical detail, it will feel very different from a normal social app.",
        },
      ],
    },
  ], ({ author, headline }) => ({ author, headline }));

  await findOrCreateMany(Comment, [
    {
      post: posts[0]._id,
      author: buyer._id,
      body: "This kind of field alert is exactly why the feed should stay active and local.",
    },
    {
      post: posts[0]._id,
      author: hobbyist._id,
      body: "Following this because I want to know if greenhouse tomatoes recover fast after early spray.",
    },
    {
      post: posts[1]._id,
      author: farmer._id,
      body: "Buyers sharing real demand trends makes planning harvests much easier on our side.",
    },
    {
      post: posts[4]._id,
      author: hotelBuyer._id,
      body: "This is exactly what our kitchen team asks for. Grade and dispatch time matter more than a small price discount.",
    },
    {
      post: posts[5]._id,
      author: youthFarmer._id,
      body: "Direct payment timing is exactly why verified seller contacts and written order notes matter in Version 1.",
    },
    {
      post: posts[6]._id,
      author: buyer._id,
      body: "Honest sorting builds repeat orders. Mixed crates are where buyer trust disappears fastest.",
    },
    {
      post: posts[7]._id,
      author: inputSupplier._id,
      body: "For onions, curing is where many small losses start. Buyers can smell wet bags before opening them.",
    },
  ], ({ post, author, body }) => ({ post, author, body }));

  await findOrCreateMany(SavedPost, [
    {
      user: buyer._id,
      post: posts[0]._id,
    },
    {
      user: buyer._id,
      post: posts[1]._id,
    },
    {
      user: hobbyist._id,
      post: posts[2]._id,
    },
  ], ({ user, post }) => ({ user, post }));

  await findOrCreateMany(LikedPost, [
    {
      user: buyer._id,
      post: posts[1]._id,
    },
    {
      user: hobbyist._id,
      post: posts[0]._id,
    },
  ], ({ user, post }) => ({ user, post }));

  const threads = await findOrCreateMany(CommunityThread, [
    {
      author: farmer._id,
      title: "What is the best way to price onions after harvest if Wakulima prices keep moving?",
      body: "I have storage for one week only. Should I release immediately, wait for Monday, or split across city and local buyers?",
      preview: "I have storage for one week only. Should I release immediately, wait for Monday, or split across city and local buyers?",
      category: "Pricing",
      repliesCount: 18,
      viewsCount: 241,
      isPinned: true,
    },
    {
      author: hobbyist._id,
      title: "Any low-cost organic pest control for sukuma wiki that actually works in rainy weather?",
      body: "Neem helped a bit, but aphids are still coming back. Looking for a routine that is safer and practical.",
      preview: "Neem helped a bit, but aphids are still coming back. Looking for a routine that is safer and practical.",
      category: "Crop care",
      repliesCount: 25,
      viewsCount: 316,
    },
    {
      author: buyer._id,
      title: "How should buyers verify quality before dispatch without creating friction for farmers?",
      body: "We want a repeatable checklist that reduces rejections while still respecting the farmer workflow.",
      preview: "We want a repeatable checklist that reduces rejections while still respecting the farmer workflow.",
      category: "Trade trust",
      repliesCount: 11,
      viewsCount: 148,
    },
    {
      author: dairyFarmer._id,
      title: "What is everyone paying for dairy meal around Nakuru this week?",
      body: "Our cooperative is comparing hay, dairy meal, and silage costs before placing a bulk order.",
      preview: "Our cooperative is comparing hay, dairy meal, and silage costs before placing a bulk order.",
      category: "Livestock",
      repliesCount: 9,
      viewsCount: 124,
    },
    {
      author: fishFarmer._id,
      title: "Any Nairobi buyers using insulated boxes for same-day tilapia delivery?",
      body: "We want to reduce spoilage complaints on hot travel days without making delivery too expensive.",
      preview: "We want to reduce spoilage complaints on hot travel days without making delivery too expensive.",
      category: "Cold chain",
      repliesCount: 7,
      viewsCount: 102,
    },
    {
      author: youthFarmer._id,
      title: "How do you handle brokers who change the potato price after loading?",
      body: "Looking for practical ways to agree on grade, weight, contact, and direct payment before the lorry leaves the farm.",
      preview: "Looking for practical ways to agree on grade, weight, contact, and direct payment before the lorry leaves the farm.",
      category: "Market access",
      repliesCount: 16,
      viewsCount: 211,
    },
  ], ({ author, title }) => ({ author, title }));

  await findOrCreateMany(ThreadReply, [
    {
      thread: threads[0]._id,
      author: buyer._id,
      body: "I would split the harvest. Move the cleanest lot early and hold a smaller batch for Monday price movement.",
    },
    {
      thread: threads[0]._id,
      author: hobbyist._id,
      body: "Watching this one because pricing always feels harder than growing.",
    },
    {
      thread: threads[1]._id,
      author: farmer._id,
      body: "Try tighter spray timing between rainy breaks and remove the worst-hit leaves early.",
    },
    {
      thread: threads[3]._id,
      author: inputSupplier._id,
      body: "Compare cost per litre of milk, not just price per bag. Cheap feed can still lower production.",
    },
    {
      thread: threads[4]._id,
      author: hotelBuyer._id,
      body: "Restaurants will pay a bit more for fish that arrives cold, labelled, and predictable.",
    },
    {
      thread: threads[5]._id,
      author: farmer._id,
      body: "Write the grade and bag count on WhatsApp before loading. It gives you something to point back to.",
    },
  ], ({ thread, author, body }) => ({ thread, author, body }));

  const orders = await findOrCreateMany(Order, [
    {
      buyer: buyer._id,
      seller: farmer._id,
      items: [
        {
          product: products[0]._id,
          name: products[0].name,
          quantity: 30,
          unitPrice: products[0].price,
          unit: products[0].unit,
        },
      ],
      totalAmount: 2850,
      status: "in-transit",
      etaLabel: "Jun 6 morning",
      note: "Seller confirmed stock by verified phone. Driver picked up after buyer and seller agreed on direct payment.",
      deliveryLocation: "Nairobi city hub",
      deliveryContact: "+254700111111",
    },
    {
      buyer: buyer._id,
      seller: farmer._id,
      items: [
        {
          product: products[1]._id,
          name: products[1].name,
          quantity: 12,
          unitPrice: products[1].price,
          unit: products[1].unit,
        },
      ],
      totalAmount: 2160,
      status: "accepted",
      etaLabel: "Jun 6 afternoon",
      note: "Packing team accepted the order and started sorting peppers. Buyer will confirm payment directly with the seller phone on profile.",
      deliveryLocation: "Kilimani, Nairobi",
      deliveryContact: "+254700111111",
    },
    {
      buyer: hotelBuyer._id,
      seller: youthFarmer._id,
      items: [
        {
          product: products[3]._id,
          name: products[3].name,
          quantity: 8,
          unitPrice: products[3].price,
          unit: products[3].unit,
        },
      ],
      totalAmount: 25600,
      status: "delivered",
      etaLabel: "Delivered Jun 4",
      note: "Delivered to Westlands kitchen entrance. Buyer accepted grade after spot check and left a seller remark.",
      deliveryLocation: "Westlands, Nairobi",
      deliveryContact: "+254711444555",
    },
    {
      buyer: buyer._id,
      seller: fishFarmer._id,
      items: [
        {
          product: products[8]._id,
          name: products[8].name,
          quantity: 15,
          unitPrice: products[8].price,
          unit: products[8].unit,
        },
      ],
      totalAmount: 7800,
      status: "accepted",
      etaLabel: "Jun 6 dispatch",
      note: "Seller confirmed morning harvest, insulated packing, and direct payment coordination by verified phone.",
      deliveryLocation: "Parklands, Nairobi",
      deliveryContact: "+254700111111",
    },
    {
      buyer: hotelBuyer._id,
      seller: farmer._id,
      items: [
        {
          product: products[9]._id,
          name: products[9].name,
          quantity: 12,
          unitPrice: products[9].price,
          unit: products[9].unit,
        },
      ],
      totalAmount: 13800,
      status: "pending",
      etaLabel: "Awaiting seller",
      note: "Buyer requested dry necks and no mixed wet bags. Awaiting verified seller contact before direct payment.",
      deliveryLocation: "Kilimani, Nairobi",
      deliveryContact: "+254711444555",
    },
  ], ({ buyer, seller, totalAmount, note }) => ({ buyer, seller, totalAmount, note }));

  await findOrCreateMany(SellerRemark, [
    {
      order: orders[0]._id,
      buyer: buyer._id,
      seller: farmer._id,
      rating: 5,
      body: "Tomatoes arrived clean and honestly sorted. The crate weight matched what was agreed.",
    },
    {
      order: orders[2]._id,
      buyer: hotelBuyer._id,
      seller: youthFarmer._id,
      rating: 4,
      body: "Good potato size for chips. Delivery was late by one hour but the grading was consistent.",
    },
  ], ({ order }) => ({ order }));

  await findOrCreateMany(Notification, [
    {
      user: buyer._id,
      title: "Order update",
      body: "Your tomato request moved to in transit after seller confirmation and direct payment coordination.",
      type: "order",
    },
    {
      user: farmer._id,
      title: "Your post got a new like",
      body: "Peter Mwangi liked \"Tomato blight alert after two days of rain in Tetu\".",
      type: "like",
    },
    {
      user: hobbyist._id,
      title: "Trust score boost",
      body: "Add clearer profile details and recent garden photos to improve credibility in the feed.",
      type: "system",
    },
    {
      user: hotelBuyer._id,
      title: "Order accepted",
      body: "Ahero Fresh Fish Farm accepted your tilapia request. Use the verified seller phone to coordinate direct payment before dispatch.",
      type: "order",
    },
    {
      user: youthFarmer._id,
      title: "New seller remark",
      body: "Wanjiku Hotel Supplies rated your potato delivery and mentioned consistent grading.",
      type: "system",
    },
  ], ({ user, title, body }) => ({ user, title, body }));

  return {
    users: 8,
    products: products.length,
    posts: posts.length,
    threads: threads.length,
  };
}

async function seed() {
  validateEnv();
  await connectToDatabase();

  const reset = process.argv.includes("--reset");
  const summary = await seedDatabase({ reset });

  console.log(`FarmConnect database ${reset ? "reset and seeded" : "seeded without resetting"} successfully.`, summary);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))) {
  seed()
    .catch((error) => {
      console.error("Failed to seed FarmConnect database.", error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await disconnectFromDatabase();
    });
}
