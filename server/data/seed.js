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
import { ThreadReply } from "../models/thread-reply.model.js";
import { User } from "../models/user.model.js";

async function seed() {
  validateEnv();
  await connectToDatabase();

  await Promise.all([
    Notification.deleteMany({}),
    SavedPost.deleteMany({}),
    LikedPost.deleteMany({}),
    Comment.deleteMany({}),
    Order.deleteMany({}),
    CommunityThread.deleteMany({}),
    ThreadReply.deleteMany({}),
    Post.deleteMany({}),
    Product.deleteMany({}),
    User.deleteMany({}),
  ]);

  const [buyer, farmer, hobbyist] = await User.create([
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
  ]);

  const products = await Product.create([
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
  ]);

  const posts = await Post.create([
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
  ]);

  await Comment.create([
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
  ]);

  await SavedPost.create([
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
  ]);

  await LikedPost.create([
    {
      user: buyer._id,
      post: posts[1]._id,
    },
    {
      user: hobbyist._id,
      post: posts[0]._id,
    },
  ]);

  const threads = await CommunityThread.create([
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
  ]);

  await ThreadReply.create([
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
  ]);

  await Order.create([
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
      etaLabel: "Apr 18",
      note: "Driver confirmed pickup and is on the way to the city hub.",
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
      etaLabel: "Apr 19",
      note: "Packing team accepted the order and started sorting peppers for dispatch.",
    },
  ]);

  await Notification.create([
    {
      user: buyer._id,
      title: "Order update",
      body: "Your tomato order moved to in transit and left the collection hub in Nyeri.",
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
  ]);

  console.log("FarmConnect database seeded successfully.");
}

seed()
  .catch((error) => {
    console.error("Failed to seed FarmConnect database.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectFromDatabase();
  });
