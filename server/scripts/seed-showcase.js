// Replaces everything in the target database with a realistic FarmConnect community for demos.
// Admin accounts are kept (so you can still sign in to the dashboard); every other account and all
// content is deleted first. It asks for an explicit flag because it wipes the database:
//   npm run server:seed:showcase -- --wipe
// Every seeded account signs in with SEED_PASSWORD (default below), e.g. grace.wambui@demo.farmconnect.
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import { connectToDatabase, disconnectFromDatabase } from "../config/db.js";
import { validateEnv } from "../config/env.js";
import { Broadcast } from "../models/broadcast.model.js";
import { BroadcastView } from "../models/broadcast-view.model.js";
import { Comment } from "../models/comment.model.js";
import { CommunityThread } from "../models/community-thread.model.js";
import { LikedPost } from "../models/liked-post.model.js";
import { Notification } from "../models/notification.model.js";
import { Order } from "../models/order.model.js";
import { Organization } from "../models/organization.model.js";
import { OtpCode } from "../models/otp-code.model.js";
import { Post } from "../models/post.model.js";
import { Product } from "../models/product.model.js";
import { Report } from "../models/report.model.js";
import { SavedPost } from "../models/saved-post.model.js";
import { SellerRemark } from "../models/seller-remark.model.js";
import { ThreadReply } from "../models/thread-reply.model.js";
import { User } from "../models/user.model.js";
import { resolveCounty } from "../utils/regions.js";
import { recalculateTrustScoreForUser } from "../utils/trust-score.js";

const PASSWORD = process.env.SEED_PASSWORD || "FarmConnect2026";
const EMAIL_DOMAIN = "demo.farmconnect";

// Deterministic randomness so the same run produces the same community.
let seed = 2026;
const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const sample = (items, count) => [...items].sort(() => random() - 0.5).slice(0, count);

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const NOW = Date.now();
const daysAgo = (days, hour = 8) => new Date(NOW - days * DAY + (hour - 12) * HOUR);
const later = (date, hours) => new Date(Math.min(date.getTime() + hours * HOUR, NOW - HOUR));

// --- People -------------------------------------------------------------------------------

const PEOPLE = [
  // key, name, role, location, verification, bio, interests, joined (days ago)
  ["grace", "Grace Wambui", "farmer", "Othaya, Nyeri", "top-rated", "Dairy farmer, 6 Friesian cows. Fodder and silage is where the money is made or lost. Happy to host farm visits.", ["Dairy", "Fodder", "Silage"], 44],
  ["kiprono", "Joseph Kiprono", "farmer", "Moiben, Eldoret", "verified", "Maize and beans on 12 acres. Tracking every input cost since 2019 so I know what actually pays.", ["Maize", "Beans", "Market prices"], 43],
  ["achieng", "Achieng Otieno", "farmer", "Dunga, Kisumu", "top-rated", "Cage and pond tilapia on Lake Victoria, plus kales for the household. Chair of a 30-member fish group.", ["Aquaculture", "Fish feed", "Cold chain"], 42],
  ["mutua", "Daniel Mutua", "farmer", "Masii, Machakos", "verified", "Dryland farmer: sorghum, green grams, cowpeas. Water harvesting is my religion.", ["Drought farming", "Water harvesting", "Pulses"], 41],
  ["mwanaisha", "Mwanaisha Hamisi", "farmer", "Mariakani, Kilifi", "verified", "Cassava, coconuts and cashew at the coast. Learning value addition with my women's group.", ["Cassava", "Value addition", "Coastal farming"], 40],
  ["chebet", "Esther Chebet", "farmer", "Kapsoit, Kericho", "verified", "Tea smallholder diversifying into Hass avocado. 300 trees and counting.", ["Avocado", "Tea", "Grafting"], 39],
  ["njoroge", "Samuel Njoroge", "farmer", "Kutus, Kirinyaga", "verified", "Greenhouse tomatoes and capsicum. Made every mistake so you don't have to.", ["Greenhouse", "Tomatoes", "Crop health"], 38],
  ["nanjala", "Faith Nanjala", "farmer", "Lurambi, Kakamega", "unverified", "Improved kienyeji chicken, 400 birds. Selling eggs and chicks in Western.", ["Poultry", "Kienyeji", "Vaccination"], 30],
  ["lemayian", "Peter Lemayian", "farmer", "Kitengela, Kajiado", "verified", "Galla goats and Dorper sheep. Planning for the dry season starts in the rains.", ["Goats", "Livestock", "Drought feed"], 36],
  ["kemunto", "Ruth Kemunto", "farmer", "Ogembo, Kisii", "unverified", "Bananas, bananas, bananas. And a few dairy goats.", ["Bananas", "Crop health", "Dairy goats"], 27],
  ["abdi", "Hassan Abdi", "farmer", "Isiolo town, Isiolo", "verified", "Camel milk producer and trader. We move milk from Isiolo to Eastleigh every morning.", ["Camel milk", "Cold chain", "Livestock"], 35],
  ["wairimu", "Lucy Wairimu", "farmer", "Ol Kalou, Nyandarua", "verified", "Potatoes and peas at 2,400 m. Seed quality is everything up here.", ["Potatoes", "Certified seed", "Storage"], 34],
  ["kiptoo", "Brian Kiptoo", "farmer", "Njoro, Nakuru", "unverified", "25, broilers and layers. Quit my boda job for this and documenting the journey.", ["Poultry", "Youth in agri", "Farm records"], 21],
  ["mwangi", "John Mwangi", "farmer", "Kangema, Murang'a", "top-rated", "Retired extension officer, 31 years. Now farming macadamia and answering questions for free.", ["Soil health", "Extension", "Macadamia"], 44],
  ["akinyi", "Mercy Akinyi", "hobbyist", "Kilimani, Nairobi", "unverified", "Growing food on a 3rd-floor balcony. Sacks, buckets, and stubbornness.", ["Kitchen garden", "Urban farming", "Composting"], 25],
  ["ouma", "Kevin Ouma", "hobbyist", "Ruiru, Kiambu", "unverified", "Oyster mushrooms in a spare room. Trying to turn a hobby into a side income.", ["Mushrooms", "Urban farming", "Side income"], 18],
  ["wanjiku", "Wanjiku Fresh Grocers", "buyer", "Westlands, Nairobi", "verified", "Three grocery outlets in Nairobi. We buy direct from farmers who can grade consistently.", ["Buyer demand", "Vegetables", "Fruits"], 40],
  ["amina", "Amina Yusuf", "buyer", "Nyali, Mombasa", "verified", "Procurement for two beach hotels. Always looking for reliable greens and fruit.", ["Buyer demand", "Hotels", "Fresh produce"], 33],
  ["shamba", "Shamba Inputs Centre", "farmer", "Thika, Kiambu", "verified", "Agro-dealer: certified seed, feeds, drip kits and soil testing. We explain before we sell.", ["Farm inputs", "Certified seed", "Soil testing"], 42],
  ["mavuno", "Mavuno Agrovet", "farmer", "Nakuru town, Nakuru", "verified", "Vet drugs, vaccines, dairy meal and hay for the Rift Valley.", ["Farm inputs", "Animal health", "Dairy"], 37],
];

const INPUT_SELLERS = new Set(["shamba", "mavuno"]);

// --- Knowledge and market posts ------------------------------------------------------------

const POSTS = [
  ["grace", 2, "knowledge", "Dairy", "From 9 to 14 litres per cow: what changed on our farm in one year",
    "Last year our cows averaged 9 litres. This month it is 14. No new cows, no magic feed.\n\nThree things changed. First, we started making maize silage in a tube bag in March, so the cows never had a hungry month. Second, we weigh dairy meal by milk yield (1 kg for every 2 litres above 7) instead of giving everyone the same scoop. Third, clean water in front of the cows all day. That alone gave us almost 2 litres.\n\nTotal extra cost is about KES 6,500 a month for six cows. Extra milk is about KES 13,000 a month at KES 45 a litre. Ask me anything, I'll share the silage method in the comments."],
  ["kiprono", 3, "knowledge", "Crop health", "Fall armyworm is back around Moiben. What is working on our 12 acres",
    "Seen the windowpane damage and sawdust-like frass in the funnels since last week. Neighbours are already spraying everything.\n\nWhat we are doing: scouting 20 plants in a W pattern twice a week, and only acting when more than 1 in 5 funnels are fresh-damaged. Early on, a pinch of sand and ash in the funnel has helped on the small plot. On the big plot we use a registered product at the label rate, sprayed into the funnel early morning.\n\nWe planted desmodium and brachiaria (push-pull) on two acres last season and damage there is clearly lower. Will post photos when it stops raining."],
  ["achieng", 4, "knowledge", "Aquaculture", "Cage vs pond tilapia: one year of my real numbers",
    "People keep asking which is better, so here are our numbers.\n\nCage (2 cages, 4,000 fingerlings): reached 350 g in 7 months, feed was 70% of cost, about 8% losses. Pond (one 300 m² pond, 1,500 fingerlings): 280 g in 8 months, cheaper feed because of natural food, but we lost almost a fifth to birds before we put up netting.\n\nIf you are near the lake and can work in a group, cages pay faster. If you are inland with water, a netted pond is safer. The biggest lesson either way: buy fingerlings from a certified hatchery. Our worst batch came from a cheap seller."],
  ["mutua", 5, "knowledge", "Drought farming", "Zai pits saved our sorghum. We got 40% of normal rain",
    "Short rains here were poor: about 40% of normal. The field planted in zai pits still gave us 9 bags of sorghum per acre. The flat-planted field next to it gave 3.\n\nPits are 60 cm wide and 30 cm deep, with a spade of manure in each. Digging is hard work the first year (we hired 4 people for a week) but the pits last 3 to 4 seasons.\n\nIf you farm in Machakos, Makueni, Kitui or anywhere dry, I really think this is the cheapest insurance there is. Happy to host anyone who wants to see them."],
  ["mwangi", 6, "knowledge", "Soil health", "Please test your soil before buying fertiliser. Here is why I insist",
    "In 31 years of extension work the most common waste I saw was farmers buying DAP every season out of habit. Many of our soils in Central are acidic. Adding more DAP on acidic soil is money thrown away.\n\nA soil test costs between KES 1,500 and 3,000 at most agro-dealers and county labs. It tells you pH, what is missing, and how much lime you need. One farmer I advised in Kangema cut fertiliser spending by a third and got a better harvest after liming.\n\nTest every 2 to 3 years. Take samples from 10 to 15 spots in a zigzag, mix them, and send half a kilo. Questions welcome."],
  ["njoroge", 7, "knowledge", "Greenhouse", "The greenhouse ventilation mistake that cost me a whole tomato crop",
    "My first greenhouse had side vents only 60 cm high. In January the inside hit 38°C every afternoon, flowers dropped, and then bacterial wilt finished us.\n\nThe second one has 1.2 m side vents with insect net, a roof vent, and we roll the sides up by 9 am. Inside temperature rarely goes above 30°C now. We also stopped watering in the evening, which brought down leaf diseases.\n\nIf you are buying a greenhouse kit, ask the seller about vent height before you ask about price."],
  ["wairimu", 8, "knowledge", "Potatoes", "Certified vs recycled potato seed: side by side on the same farm",
    "We planted half an acre with certified Shangi seed and half with seed recycled from our own store for the third season.\n\nCertified: 112 bags of 50 kg from half an acre. Recycled: 61 bags, with a lot more bacterial wilt and small tubers. The certified seed cost KES 9,000 more but returned roughly KES 70,000 more at Ol Kalou prices.\n\nIf you cannot afford certified seed every season, buy it once and multiply it carefully for one season only, on clean land."],
  ["chebet", 9, "knowledge", "Avocado", "Grafting Hass on local rootstock: our step-by-step",
    "We raise our own rootstock from local avocado seeds, then graft Hass scions when the stem is pencil-thick (about 4 to 5 months).\n\nCleft graft, clean razor, grafting tape, plastic bag over the scion for 3 weeks. Our success rate went from about 50% to 85% once we stopped grafting on hot afternoons and only took scions from healthy, certified mother trees.\n\nExporters around here only buy from registered farms now, so register with your county early if you want to sell Hass."],
  ["lemayian", 10, "knowledge", "Livestock", "Dry season feed plan for goats: what we stored during the rains",
    "Last drought we lost 14 goats. This year we started preparing in April.\n\nWe baled 300 bales of natural grass when it was green, stored maize stover under a roof, and planted 1 acre of Boma Rhodes. We also mix acacia pods (collected by the kids) with a little molasses as a supplement.\n\nWe sold the older bucks before prices dropped, so the herd we are feeding is the herd we actually want to keep. Plan your sales before the drought, not during it."],
  ["abdi", 11, "knowledge", "Cold chain", "How we cut camel milk spoilage on the road to Nairobi",
    "We used to lose up to 15% of our milk between Isiolo and Eastleigh. It is a 4 to 5 hour trip.\n\nWhat fixed it: aluminium cans instead of plastic jerricans (easier to clean properly), chilling at the collection point before loading, and leaving at 3 am instead of 6 am. Our group shares one chiller now.\n\nSpoilage is now under 3%. The cans cost more but they paid for themselves in two months."],
  ["kemunto", 12, "knowledge", "Crop health", "Banana Xanthomonas wilt is spreading in Kisii. Disinfect your tools",
    "Yellowing leaves, a male bud that shrivels, and yellow ooze when you cut the stem. If you see this, act now.\n\nWe lost a quarter of our mats before we learned. Cut and bury infected plants. Disinfect pangas with JIK or by flaming between every mat. Remove the male bud with a forked stick after the last hand forms, because insects carry the disease from the flower.\n\nPlease share this with anyone growing bananas in Kisii and Nyamira."],
  ["nanjala", 13, "knowledge", "Poultry", "Vaccinating kienyeji chicken against Newcastle on a small budget",
    "Newcastle disease wiped out half my flock in 2023. Now I vaccinate every 3 months and have not had an outbreak since.\n\nThe vaccine for 100 birds costs less than one chicken. Give it in drinking water early in the morning, and keep the vaccine cold (I carry it from town in a flask with ice). Withhold water for 2 hours first so the birds drink it quickly.\n\nGet a schedule from your vet or agrovet and write it on the wall of the chicken house."],
  ["kiptoo", 14, "knowledge", "Youth in agri", "Started with 50 broilers. Here is the money, month by month",
    "Month 1: 50 chicks, feed, drugs and charcoal cost KES 23,000. Sold 47 birds at KES 650 each = KES 30,550. Profit about KES 7,500.\n\nMonth 3: 200 birds. Profit KES 31,000, but I lost 22 birds to cold one night. Bought a second brooder.\n\nMonth 5: 300 birds and a hotel in Nakuru takes 100 a week. Biggest lesson: keep records from day one. I write everything in a KES 50 exercise book and now I know exactly what each bird costs me."],
  ["akinyi", 15, "knowledge", "Kitchen garden", "Our balcony sack garden now feeds a family of four with greens",
    "Six sacks of sukuma and spinach, 4 buckets of tomatoes, herbs in tins. We have not bought greens in two months.\n\nThe trick for sacks is a column of gravel down the middle so water reaches the bottom. Kitchen waste goes into a small compost bin. It doesn't smell if you add dry leaves or sawdust.\n\nIf you live in a flat in Nairobi, you have more space than you think."],
  ["ouma", 16, "knowledge", "Mushrooms", "First oyster mushroom harvest from a spare room in Ruiru",
    "40 substrate bags (pasteurised wheat straw), spawn from a supplier in Thika, and a room kept damp with a wet sack on the window.\n\nFirst flush was 11 kg in 5 weeks. Restaurants in Ruiru pay KES 500 to 600 a kg for fresh oyster mushrooms.\n\nMistake: I pasteurised the first batch for too short a time and lost 8 bags to green mould. Hold it at 70 to 80°C for at least an hour."],
  ["grace", 17, "knowledge", "Fodder", "A Kericho farmer asked how we make tube silage. Full method",
    "Chop maize at the dough stage into 2 to 3 cm pieces. Add 1 litre of molasses mixed in 3 litres of water for every 100 kg of chopped material.\n\nPack it into the tube bag in layers and press out every bit of air (we use our feet). Tie it tight and keep it in shade away from rats. Open after 21 days and it keeps for months.\n\nOne tube bag holds about 1 tonne. It costs about KES 1,000 and lasts two seasons if you are careful."],
  ["wanjiku", 2, "market", "Buyer demand", "What our Nairobi shops want from tomato suppliers this month",
    "We are buying 60 crates a week and we can't get enough of grade 1 tomatoes.\n\nWhat we need: firm, even size, sorted before loading, and in crates, not sacks. We pay KES 300 to 400 more per crate for properly sorted produce, and we pay on delivery through M-Pesa.\n\nFarmers in Kirinyaga, Kajiado and Nakuru: message us if you can supply weekly."],
  ["kiprono", 4, "market", "Market prices", "Maize prices this week: Eldoret vs Kitale vs NCPB",
    "Prices we got or confirmed this week for a 90 kg bag of dry maize:\n\nEldoret traders: KES 3,300 to 3,500. Kitale traders: KES 3,200 to 3,400. NCPB depot: KES 3,500, but expect to queue and moisture must be under 13.5%.\n\nDry your maize properly. Brokers knock off KES 300 to 500 per bag if they claim it is wet. A cheap moisture meter pays for itself."],
  ["amina", 6, "market", "Buyer demand", "Coast hotels are short on leafy greens and herbs",
    "Our two hotels are struggling to get steady spinach, coriander and dhania-like herbs. Most of it comes from upcountry and arrives wilted.\n\nWe would prefer coastal growers (Kilifi, Kwale) who can deliver 3 times a week. We can commit to fixed weekly volumes and pay within 7 days.\n\nIf your group grows greens with irrigation, let's talk."],
  ["achieng", 8, "market", "Market prices", "Fish prices at Dunga beach this week",
    "Fresh tilapia at the beach this week: KES 350 to 400 per kg for 300 g+ fish, KES 250 for smaller fish. Omena is up because of the full moon.\n\nCold buyers from Nairobi are offering KES 420 per kg for gutted, iced fish of the same size if you can supply 200 kg or more. Our group is pooling to meet that volume."],
  ["mutua", 12, "market", "Market prices", "Green grams are paying better than maize in Machakos",
    "Traders at Masii are paying KES 120 to 140 per kg for clean green grams. From one acre we harvested 6 bags of 90 kg.\n\nThat is about KES 70,000 from one acre in a dry season, compared to maybe KES 20,000 from maize on the same land. Pulses also fix nitrogen for the next crop.\n\nUse certified seed (we used KS20) and harvest as soon as the pods turn black."],
  ["shamba", 5, "sponsored", "Farm inputs", "Free soil test with every drip kit this month in Thika",
    "Buy any quarter-acre or half-acre drip kit from Shamba Inputs Centre this month and we will test your soil for free (worth KES 2,500).\n\nWe will also send a technician to help set up if you are within 30 km of Thika. Ask us for the planting guide that comes with each kit."],
  ["mwangi", 19, "knowledge", "Extension", "Questions you should ask before joining any contract farming scheme",
    "Every season farmers ask me about a new contract scheme. Before you sign, ask:\n\n1. Is the price fixed in writing, and what happens if the market price goes up? 2. Who pays for inputs, and is it deducted from your harvest? 3. What are the quality standards, and who decides if you passed? 4. When exactly will you be paid?\n\nIf they won't give you answers in writing, walk away. A good buyer doesn't fear questions."],
  ["njoroge", 21, "knowledge", "Crop health", "Tuta absoluta: pheromone traps cut our spraying by half",
    "Tuta absoluta mines the leaves and fruit, and it builds resistance quickly if you keep spraying the same product.\n\nWe put up 4 pheromone traps per greenhouse to monitor and catch males. Now we only spray when the traps show numbers going up, and we rotate products. We spray half as often as last year and the damage is lower.\n\nTraps cost about KES 600 each and the lures last 6 weeks."],
];

// --- Questions and answers between regions ------------------------------------------------

const THREADS = [
  ["chebet", 3, "Crop care", "Avocado fruit dropping before maturity. Is it water or a pest?",
    "Our 3-year-old Hass trees in Kericho set lots of fruit, but about half drop when they are the size of an egg. We had a dry spell in August. Could it be water stress, or something else?",
    [["mwangi", "Usually water stress in young trees, especially after a dry spell during fruit set. Mulch heavily around the base and water deeply once a week if you can. Also check for thrips on young fruit."], ["grace", "We saw the same in Nyeri on our few trees. Mulching with napier cuttings helped a lot."], ["chebet", "Thank you both. Mulching this weekend and I will check for thrips."]]],
  ["kiptoo", 4, "Livestock", "Broilers dying at night in Njoro. Too cold?",
    "Lost 22 birds in one cold night at week 2. I use a charcoal jiko for heat. How do others keep chicks warm in Nakuru's cold nights?",
    [["nanjala", "At week 2 they still need about 30°C. Watch the chicks: if they crowd under the heat they are cold, if they move far away it's too hot. Put curtains on the sides at night."], ["mavuno", "Also make sure the jiko has ventilation. Charcoal fumes kill chicks too. We stock gas brooders if you scale up."], ["kiptoo", "I closed all the curtains, so it might have been the fumes. Changing the setup tonight. Thank you."]]],
  ["mwanaisha", 5, "Crop care", "Cassava brown streak in Kilifi. Which varieties resist it?",
    "Our cassava roots have brown, corky streaks inside at harvest. Buyers reject them. Which varieties are tolerant at the coast, and where can we get clean cuttings?",
    [["mwangi", "Ask your county agriculture office about tolerant varieties and certified cutting multipliers near you. Never take cuttings from a field that had the disease, even from plants that look healthy."], ["mutua", "In Machakos we got clean cuttings through a farmer group program. Worth asking at your ward office."]]],
  ["akinyi", 6, "Crop care", "Aphids all over my balcony sukuma. Anything safe to spray?",
    "My kids eat these greens straight from the sack, so I don't want chemicals. The undersides of the leaves are covered in aphids.",
    [["ouma", "Soapy water (plain bar soap, not detergent) sprayed under the leaves every 3 days worked for me."], ["njoroge", "Also blast them off with a strong water spray and remove the worst leaves. Ladybirds will come if you stop spraying chemicals."], ["mwangi", "Neem extract works well too. Pick the greens a day after spraying and wash them."]]],
  ["wairimu", 7, "Pricing", "Brokers in Ol Kalou want extended bags again. How do others sell potatoes by weight?",
    "The law says 50 kg bags, but brokers here still push for extended bags that hold 110 kg or more. How have other potato areas managed to sell by weight?",
    [["kiprono", "In Eldoret we sell maize by weight at the stores now. Could your group hire a weighing scale and refuse to load anything not weighed?"], ["mwangi", "Group marketing is the answer. One farmer alone can't refuse a broker, but 40 farmers can. Talk to your county trade office about enforcement too."], ["wanjiku", "As a buyer, we prefer buying by weight. It's fairer and we know what we're paying for."]]],
  ["ouma", 8, "Farm Inputs", "Where do you buy reliable mushroom spawn?",
    "My last batch of spawn was contaminated and I lost 8 bags. Who are reliable suppliers around Nairobi or Kiambu?",
    [["shamba", "We stock oyster spawn from a certified lab and keep it refrigerated. We can also show you how to check spawn before you buy."], ["akinyi", "Ask to see the spawn: it should be white all through with no green or black patches."]]],
  ["lemayian", 9, "Livestock", "Is it worth crossing Galla goats with Boer in Kajiado?",
    "Thinking of buying a Boer buck to cross with my Galla does. Are the crosses as hardy in the dry season?",
    [["abdi", "In Isiolo the first crosses do well, but we keep some pure Galla because they survive long droughts better. Don't replace your whole herd."], ["mavuno", "Crosses grow faster but need more feed. Only do it if you have your dry-season feed plan sorted, which you clearly do."]]],
  ["njoroge", 10, "Market Prices", "Who is buying capsicum in bulk right now?",
    "We'll have about 2 tonnes of green and coloured capsicum in 3 weeks. Prices at Wakulima are low. Any hotel or supermarket buyers here?",
    [["amina", "We take coloured capsicum at the coast. Send me your grading and delivery options."], ["wanjiku", "We can take 300 kg a week of green capsicum in Nairobi."]]],
  ["mutua", 11, "Crop care", "Has anyone tried drip irrigation with harvested rainwater?",
    "We have a 50,000-litre farm pond. Is drip from a pond practical for an acre of vegetables in the dry season?",
    [["shamba", "Yes. A quarter acre of drip uses roughly 4,000 to 6,000 litres a day for most vegetables, so your pond covers a short dry spell. Filter well, because pond water blocks drippers."], ["njoroge", "Line the pond and cover it with shade net to cut evaporation. Ours loses half as much water since we covered it."]]],
  ["nanjala", 13, "Trade trust", "A buyer took 200 trays of eggs and hasn't paid. What can I do?",
    "Agreed on payment after 7 days. It's been 5 weeks. I have his number and our WhatsApp chat. Any advice?",
    [["mwangi", "Write a formal demand letter giving 7 days, keep copies of the chat, and report to the small claims court if he doesn't pay. It's cheap and fast for amounts like this."], ["kiptoo", "Since then I only do cash on delivery or M-Pesa before the goods leave, even with regular buyers."], ["wanjiku", "Ask new buyers for a reference from another supplier. Good buyers will have one."]]],
  ["abdi", 15, "Market Prices", "Camel milk prices in Eastleigh vs Isiolo",
    "We're getting KES 100 a litre in Isiolo and KES 140 in Eastleigh. Is it worth the transport cost to sell in Nairobi ourselves?",
    [["achieng", "Same story with fish. Once our group pooled transport and a chiller, the Nairobi price made sense. Alone it didn't."]]],
  ["kemunto", 17, "Crop care", "Tissue culture bananas: worth the price?",
    "Tissue culture plantlets are about KES 150 each compared to free suckers from my own farm. Is the yield difference really that big?",
    [["chebet", "Yes, if your farm already has disease. Tissue culture plants are clean. We got bunches 30% heavier."], ["mwangi", "Plant them in fresh holes with plenty of manure, and don't bring suckers from infected fields next to them."]]],
];

// --- Marketplace (secondary to knowledge, so kept small) ----------------------------------

const PRODUCTS = [
  ["shamba", "Certified bean seed (KK15), 2 kg", "Farm inputs", "pack", 650, 120, "Certified bush bean seed, bred to resist root rot. Enough for about a quarter acre.", true, "input-company"],
  ["shamba", "Quarter-acre drip irrigation kit", "Farm inputs", "kit", 28500, 15, "Complete kit with tank connector, filter, laterals and drippers. Includes setup within 30 km of Thika.", true, "input-company"],
  ["shamba", "Soil test (lab analysis)", "Farm inputs", "test", 2500, 200, "pH, N-P-K and lime requirement with a written recommendation for your crop.", false, "input-company"],
  ["mavuno", "Newcastle vaccine, 100 doses", "Farm inputs", "vial", 180, 300, "Kept refrigerated. Ask us for a free cool box if you are travelling more than an hour.", false, "input-company"],
  ["mavuno", "Dairy meal, 70 kg", "Farm inputs", "bag", 3400, 80, "16% protein dairy meal. Delivery available around Nakuru and Njoro.", false, "input-company"],
  ["wairimu", "Certified Shangi seed potatoes", "Farm inputs", "50 kg bag", 4200, 40, "Second generation from certified seed, stored in a diffuse light store. Clean land.", false, "farmer"],
  ["grace", "Maize silage, 1 tonne tube", "Farm inputs", "tube", 9000, 6, "Well-fermented maize silage with molasses. Pick up from Othaya.", false, "farmer"],
  ["achieng", "Fresh tilapia, 300 g+", "Fish", "kg", 400, 250, "Gutted and iced on request. Group supply from Dunga, Kisumu.", true, "farmer"],
  ["mutua", "Green grams (KS20)", "Grains", "kg", 130, 500, "Clean, sorted green grams from Masii. Can supply up to 1 tonne.", false, "farmer"],
  ["chebet", "Grafted Hass avocado seedlings", "Farm inputs", "seedling", 250, 400, "Grafted on local rootstock, 6 months old. Mother trees are certified.", true, "farmer"],
  ["njoroge", "Greenhouse tomatoes, grade 1", "Vegetables", "crate", 3800, 60, "Sorted, firm tomatoes in crates. Weekly supply to Nairobi.", true, "farmer"],
  ["nanjala", "Improved kienyeji chicks, 1 month", "Livestock", "chick", 180, 300, "Vaccinated against Newcastle and Gumboro. Pick up in Kakamega.", false, "farmer"],
  ["abdi", "Fresh camel milk", "Dairy", "litre", 140, 200, "Chilled at collection, delivered to Eastleigh daily.", false, "farmer"],
  ["ouma", "Fresh oyster mushrooms", "Vegetables", "kg", 550, 15, "Harvested on order, delivered around Ruiru and Thika Road.", false, "farmer"],
];

// --- Official broadcasts (fictional organisations) ----------------------------------------

const ORGANIZATIONS = [
  ["Rift Valley Dairy Farmers Cooperative", "cooperative", "A farmer-owned dairy cooperative running milk collection and extension services."],
  ["Kilimo Bora Research Network", "research", "Applied crop research shared directly with smallholder farmers."],
  ["Smallholder Climate Advisory", "ngo", "Seasonal weather outlooks and climate-smart farming advice for smallholders."],
  ["Lake Region Aquaculture Association", "cooperative", "Fish farmer groups around Lake Victoria working on feed, fingerlings and markets."],
];

const BROADCASTS = [
  [1, "advisory", 1, "Harvest season: dry maize and groundnuts properly to avoid aflatoxin", "Aflatoxin grows on grain stored damp. Dry maize and groundnuts on tarpaulins (never bare ground) until moisture is below 13.5%, sort out mouldy or broken grain, and store in clean bags on pallets off the floor. Contaminated grain is rejected by buyers and is dangerous for people and animals.", [], []],
  [1, "pest-alert", 3, "Fall armyworm reported in Uasin Gishu and Trans Nzoia", "Farmers in Uasin Gishu and Trans Nzoia have reported fall armyworm damage in young maize. Scout 20 plants twice a week and act if more than 1 in 5 funnels show fresh damage. Use registered products at label rates only, and consider push-pull for next season.", ["Uasin Gishu", "Trans Nzoia", "Nakuru"], ["farmer"]],
  [2, "weather", 5, "Short rains outlook: below normal for the south-east", "Below-normal rainfall is expected for Machakos, Makueni, Kitui and Kajiado. Plant drought-tolerant crops such as sorghum, green grams and cowpeas, use water harvesting where you can, and plan livestock feed now.", ["Machakos", "Makueni", "Kitui", "Kajiado"], []],
  [0, "market", 6, "Milk collection price rises to KES 50 per litre", "From the 1st of next month the cooperative will pay KES 50 per litre for milk that passes the quality test at collection centres in Nakuru and Nyandarua. Bring clean aluminium cans to avoid rejection.", ["Nakuru", "Nyandarua"], ["farmer"]],
  [3, "training", 8, "Free fish feed formulation training in Kisumu", "A two-day hands-on session on making affordable fish feed from local ingredients. Open to members of registered fish farmer groups. Bring a notebook. Lunch is provided.", ["Kisumu", "Siaya", "Homa Bay"], ["farmer"]],
  [1, "advisory", 10, "Banana Xanthomonas wilt: control steps for Kisii and Nyamira", "Cut and bury infected plants, disinfect tools between mats, and remove male buds with a forked stick. Do not move suckers from infected farms. Report new cases to your ward extension officer.", ["Kisii", "Nyamira"], []],
];

// --- Helpers --------------------------------------------------------------------------------

async function wipe() {
  const admins = await User.find({ isAdmin: true }).select("_id name email").lean();
  const adminIds = admins.map((admin) => admin._id);

  await Promise.all([
    Notification.deleteMany({}),
    SavedPost.deleteMany({}),
    LikedPost.deleteMany({}),
    SellerRemark.deleteMany({}),
    Comment.deleteMany({}),
    ThreadReply.deleteMany({}),
    CommunityThread.deleteMany({}),
    Post.deleteMany({}),
    Order.deleteMany({}),
    Product.deleteMany({}),
    Report.deleteMany({}),
    BroadcastView.deleteMany({}),
    Broadcast.deleteMany({}),
    Organization.deleteMany({}),
    OtpCode.deleteMany({}),
    User.deleteMany({ _id: { $nin: adminIds } }),
  ]);
  // Their follow lists pointed at accounts that no longer exist.
  await User.updateMany({ _id: { $in: adminIds } }, { $set: { following: [], followers: [] } });

  return admins;
}

function stamp(date) {
  return { createdAt: date, updatedAt: date };
}

async function main() {
  if (!process.argv.includes("--wipe")) {
    console.error("This deletes every non-admin account and all content, then loads demo data.");
    console.error("Run it again with --wipe to confirm:  npm run server:seed:showcase -- --wipe");
    process.exitCode = 1;
    return;
  }

  validateEnv();
  await connectToDatabase();
  console.log(`Target database: ${mongoose.connection.name} on ${mongoose.connection.host}`);

  const admins = await wipe();
  console.log(`Wiped. Kept ${admins.length} admin account(s): ${admins.map((admin) => admin.email || admin.name).join(", ") || "none"}`);

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // People
  const userDocs = PEOPLE.map(([key, name, role, location, verificationStatus, bio, interests, joined]) => ({
    name,
    email: `${key === "shamba" || key === "mavuno" ? key : name.toLowerCase().split(" ").join(".")}@${EMAIL_DOMAIN}`,
    password: passwordHash,
    emailVerified: true,
    role,
    location,
    county: resolveCounty(location),
    interests,
    bio,
    avatarUrl: "",
    // Left blank on purpose: made-up numbers could belong to real people, and the app shows a Call button.
    phone: "",
    verificationStatus,
    ...stamp(daysAgo(joined, 9)),
  }));
  const users = await User.insertMany(userDocs);
  const user = Object.fromEntries(PEOPLE.map(([key], index) => [key, users[index]]));
  const farmers = users.filter((entry) => entry.role === "farmer");

  // Follows: well-known mentors gather followers, everyone follows a few people across regions.
  const mentors = ["grace", "mwangi", "achieng", "mutua", "kiprono"].map((key) => user[key]);
  const following = new Map(users.map((entry) => [String(entry._id), new Set()]));
  for (const entry of users) {
    const picks = [...sample(mentors, 3), ...sample(farmers, 3)].filter((other) => String(other._id) !== String(entry._id));
    picks.forEach((other) => following.get(String(entry._id)).add(String(other._id)));
  }
  const followers = new Map(users.map((entry) => [String(entry._id), new Set()]));
  following.forEach((targets, from) => targets.forEach((target) => followers.get(target).add(from)));
  await User.bulkWrite(
    users.map((entry) => ({
      updateOne: {
        filter: { _id: entry._id },
        update: { $set: { following: [...following.get(String(entry._id))], followers: [...followers.get(String(entry._id))] } },
      },
    }))
  );

  // Marketplace
  const productDocs = PRODUCTS.map(([key, name, category, unit, price, stock, description, featured, sellerType], index) => ({
    seller: user[key]._id,
    name,
    category,
    unit,
    price,
    stock,
    description,
    featured,
    sellerType,
    location: user[key].location,
    county: user[key].county,
    isOrganic: false,
    ...stamp(daysAgo(30 - index, 10)),
  }));
  const products = await Product.insertMany(productDocs);
  const product = (name) => products.find((entry) => entry.name === name);

  // Posts, with comments, likes and saves from people in other regions.
  const linked = { shamba: product("Quarter-acre drip irrigation kit") };
  const posts = await Post.insertMany(
    POSTS.map(([key, days, postType, tag, headline, body], index) => ({
      author: user[key]._id,
      postType,
      tag,
      headline,
      body,
      location: user[key].location,
      county: user[key].county,
      linkedProduct: postType === "sponsored" ? linked[key]?._id ?? null : null,
      isSponsored: postType === "sponsored",
      isPinned: index === 0,
      ...stamp(daysAgo(days, 6 + (index % 12))),
    }))
  );

  const COMMENTS = [
    "This is exactly what I needed. Saving it.",
    "Thank you for sharing real numbers. Most people only share the good part.",
    "We tried this in our area and it worked too.",
    "Can you share where you bought the inputs?",
    "Would love to visit your farm and see this.",
    "How long before you saw a difference?",
    "Sharing this with my farmer group on WhatsApp.",
    "Very practical. Asante sana.",
    "Is this the same at higher altitude? We are much colder here.",
    "What did it cost you in total for the first season?",
  ];
  const commentDocs = [];
  const likeDocs = [];
  const saveDocs = [];
  const counts = new Map();

  posts.forEach((post, index) => {
    const others = users.filter((entry) => String(entry._id) !== String(post.author));
    const commenters = sample(others, 2 + (index % 4));
    const likers = sample(others, 5 + Math.floor(random() * 12));
    const savers = sample(others, 1 + Math.floor(random() * 6));

    commenters.forEach((commenter, position) => {
      commentDocs.push({
        post: post._id,
        author: commenter._id,
        body: COMMENTS[(index * 3 + position) % COMMENTS.length],
        ...stamp(later(post.createdAt, 3 + position * 7)),
      });
    });
    likers.forEach((liker) => likeDocs.push({ post: post._id, user: liker._id, ...stamp(later(post.createdAt, 2 + random() * 48)) }));
    savers.forEach((saver) => saveDocs.push({ post: post._id, user: saver._id, ...stamp(later(post.createdAt, 4 + random() * 72)) }));
    counts.set(String(post._id), { commentsCount: commenters.length, likesCount: likers.length, savesCount: savers.length });
  });

  await Promise.all([Comment.insertMany(commentDocs), LikedPost.insertMany(likeDocs), SavedPost.insertMany(saveDocs)]);
  await Post.bulkWrite(posts.map((post) => ({ updateOne: { filter: { _id: post._id }, update: { $set: counts.get(String(post._id)) } } })));

  // Community questions and answers
  const threads = await CommunityThread.insertMany(
    THREADS.map(([key, days, category, title, body, replies], index) => ({
      author: user[key]._id,
      title,
      body,
      preview: body.slice(0, 160),
      category,
      repliesCount: replies.length,
      viewsCount: 40 + Math.floor(random() * 260),
      isPinned: index === 0,
      ...stamp(daysAgo(days, 7 + (index % 10))),
    }))
  );
  await ThreadReply.insertMany(
    THREADS.flatMap(([, , , , , replies], index) =>
      replies.map(([key, body], position) => ({
        thread: threads[index]._id,
        author: user[key]._id,
        body,
        ...stamp(later(threads[index].createdAt, 2 + position * 9)),
      }))
    )
  );

  // Orders and remarks
  const ORDERS = [
    ["wanjiku", "Greenhouse tomatoes, grade 1", 12, "delivered", 9, "Westlands, Nairobi", 5, "Firm, well-sorted crates. Exactly the grading we asked for."],
    ["amina", "Fresh tilapia, 300 g+", 80, "delivered", 7, "Nyali, Mombasa", 5, "Iced properly and arrived on time for the weekend buffet."],
    ["kiptoo", "Newcastle vaccine, 100 doses", 3, "delivered", 12, "Njoro, Nakuru", 4, "Came with a cool box and clear instructions."],
    ["mutua", "Quarter-acre drip irrigation kit", 1, "delivered", 15, "Masii, Machakos", 5, "Technician helped us set it up. Very patient."],
    ["kemunto", "Grafted Hass avocado seedlings", 40, "in-transit", 2, "Ogembo, Kisii", null, ""],
    ["wanjiku", "Fresh oyster mushrooms", 10, "accepted", 1, "Westlands, Nairobi", null, ""],
    ["lemayian", "Dairy meal, 70 kg", 4, "pending", 0, "Kitengela, Kajiado", null, ""],
    ["nanjala", "Certified bean seed (KK15), 2 kg", 5, "delivered", 18, "Lurambi, Kakamega", 4, "Good germination, almost every seed came up."],
    ["amina", "Green grams (KS20)", 100, "cancelled", 6, "Nyali, Mombasa", null, ""],
  ];
  const ETA = { pending: "Awaiting seller", accepted: "Preparing order", "in-transit": "On the way", delivered: "Completed", cancelled: "Cancelled" };
  const orders = await Order.insertMany(
    ORDERS.map(([buyerKey, productName, quantity, status, days, deliveryLocation]) => {
      const item = product(productName);
      return {
        buyer: user[buyerKey]._id,
        seller: item.seller,
        items: [{ product: item._id, name: item.name, quantity, unitPrice: item.price, unit: item.unit }],
        totalAmount: item.price * quantity,
        status,
        etaLabel: ETA[status],
        deliveryLocation,
        county: resolveCounty(deliveryLocation),
        ...stamp(daysAgo(days, 11)),
      };
    })
  );
  await SellerRemark.insertMany(
    ORDERS.flatMap(([buyerKey, , , , , , rating, body], index) =>
      rating ? [{ order: orders[index]._id, buyer: user[buyerKey]._id, seller: orders[index].seller, rating, body, ...stamp(later(orders[index].createdAt, 30)) }] : []
    )
  );

  // Official broadcasts, published by the first admin when there is one.
  const publisher = admins[0]?._id;
  const organizations = await Organization.insertMany(
    ORGANIZATIONS.map(([name, type, description]) => ({ name, type, description, createdBy: publisher, ...stamp(daysAgo(40)) }))
  );
  const broadcasts = await Broadcast.insertMany(
    BROADCASTS.map(([orgIndex, category, days, title, body, counties, roles]) => {
      const reach = users.filter((entry) => (!counties.length || counties.includes(entry.county)) && (!roles.length || roles.includes(entry.role))).length;
      return {
        organization: organizations[orgIndex]._id,
        title,
        body,
        category,
        counties,
        roles,
        status: "published",
        publishedAt: daysAgo(days, 7),
        createdBy: publisher,
        publishedBy: publisher,
        reach,
        ...stamp(daysAgo(days, 6)),
      };
    })
  );

  // Notifications so signed-in demo accounts have something waiting.
  const notifications = [];
  for (const entry of users) {
    const theirPosts = posts.filter((post) => String(post.author) === String(entry._id));
    for (const post of theirPosts.slice(0, 2)) {
      notifications.push({ user: entry._id, type: "like", title: "Your post is getting attention", body: `${counts.get(String(post._id)).likesCount} farmers liked "${post.headline}".`, link: `/post/${post._id}`, ...stamp(later(post.createdAt, 30)) });
    }
    const broadcast = broadcasts.find((item) => item.counties.includes(entry.county));
    if (broadcast) {
      notifications.push({ user: entry._id, type: "broadcast", title: broadcast.title, body: broadcast.body.slice(0, 140), link: `/broadcast/${broadcast._id}`, ...stamp(broadcast.publishedAt) });
    }
  }
  await Notification.insertMany(notifications);

  for (const entry of users) {
    await recalculateTrustScoreForUser(entry._id);
  }

  console.log("Seeded:", {
    users: users.length,
    posts: posts.length,
    comments: commentDocs.length,
    threads: threads.length,
    products: products.length,
    orders: orders.length,
    broadcasts: broadcasts.length,
  });
  console.log(`Demo sign-in: ${users[0].email} / ${PASSWORD}  (every seeded account uses the same password)`);
}

main()
  .catch((error) => {
    console.error("Showcase seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectFromDatabase();
  });
