# FarmConnect

FarmConnect is now defined as a mobile-first agri ecosystem platform.

The primary product is the mobile app. The backend is the shared system engine. The web app is secondary and should be treated as an admin, moderation, analytics, and fallback-access layer rather than the main user experience.

## Product hierarchy

1. `client/mobile`
   Expo mobile app for the main user journey
2. `server`
   Shared backend for mobile and future web
3. `client/web` (planned)
   Secondary dashboard layer for admin and support use cases

## Mobile-first product direction

The core FarmConnect experience should center on:

- onboarding and authentication
- a mixed home feed for knowledge, listings, and trending content
- marketplace transactions
- community discussions and Q&A
- order tracking
- profile identity and reputation
- notifications

Bottom navigation should remain:

`Home | Marketplace | Community | Orders | Profile`

## System architecture

### Mobile app

Path: `client/mobile`

Current role:

- main user interface for Android and iOS
- feed-first discovery experience
- marketplace browsing and ordering
- community participation
- trust and profile visibility

Recommended stack direction:

- Expo
- Expo Router / React Navigation
- Axios for API calls
- Lottie for splash and loading animation

### Backend

Path: `server`

Current role:

- Express API
- shared business logic for mobile and future web
- authentication, listings, orders, community, notifications, and reputation services

Stack:

- Node.js
- Express
- MongoDB
- JWT auth

Planned integrations:

- Cloudinary for images
- Flutterwave or Paystack for payments later

### Web dashboard

Status: planned secondary product

Suggested role:

- admin dashboard
- analytics
- moderation
- fallback web access

This should not drive the main product decisions ahead of mobile.

## Workspace

```text
FarmConnect/
|- client/
|  |- mobile/          Primary Expo app (Android/iOS)
|  |  |- app/          Screens, one file per route (expo-router)
|  |  |- components/   ui/ primitives, plus feature folders (feed, market, community, ...)
|  |  |- constants/    Design tokens, counties, topics
|  |  |- hooks/        Data queries and shared actions
|  |  \- lib/          API client, types, query cache
|  \- admin/           Web dashboard (Vite + React): moderation, analytics, broadcasts
|- server/             Express + MongoDB API
|  |- controllers/     Request handlers (admin/ for the dashboard)
|  |- services/        Shared business logic (moderation)
|  |- models/          Mongoose schemas
|  |- routes/          URL wiring only
|  |- scripts/         One-off maintenance and demo-data scripts
|  \- utils/           Helpers (regions, trust score, notifications, ...)
|- render.yaml         Render deploy config (API + admin)
\- package.json        Root scripts; backend dependencies
```

## Commands

From the repo root:

```bash
npm run server          # API with auto-reload
npm run admin           # admin dashboard
npm run client          # Expo dev server for the mobile app
npm run android
npm run ios
npm run web
npm run lint:mobile
```

## Admin dashboard

`client/admin` is a web dashboard for moderation, seller verification, and account safety. Admins sign in with a normal FarmConnect account that has admin access.

1. Create an account in the mobile app (or use an existing one).
2. Grant it admin access from the repo root, against the database in `.env`:

   ```bash
   npm run server:make-admin -- you@example.com
   npm run server:make-admin -- you@example.com --revoke   # remove access
   ```

3. Run the dashboard with `npm run admin` and sign in with that account's email and password.

What admins can do:

- **Reports**: see exactly what was reported, then remove it (the author is notified with your reason), dismiss it, or restore it later.
- **People**: verify farmers (verified sellers get a badge and their phone shown to buyers), and suspend or reinstate accounts. Suspension blocks sign-in and hides the seller's listings.
- **Feed / Community**: pin or remove posts and discussions.
- **Listings**: feature listings on the market, remove misleading ones.
- **Orders**: find stuck orders (pending 3+ days, or no progress for a week) and cancel them with a reason; stock returns to the listing.
- **Analytics**: growth, knowledge sharing, orders and delivered value over time; a county-by-county breakdown; asking prices by county; what buyers order; what farmers ask about and which questions go unanswered. Filter by date range and county.
- **Broadcasts**: add verified organisations (ministries, county departments, research bodies, NGOs), then publish advisories, pest alerts, weather and programme updates on their behalf to chosen counties and roles. The composer shows exactly how many people will be notified; recipients get a notification and the update sits at the top of their Home feed. Reach and opens are tracked per broadcast.
- **Partner report (CSV)**: aggregated county figures safe to share with partners. Counts under 5 show as "<5" and values from fewer than 5 orders are withheld, so no individual can be identified.
- **Audit log**: every admin action, who took it, and why.

### Regions

Locations are free text, so the server maps them to Kenya's 47 counties (`server/utils/regions.js`) and stores the result as `county` on users, listings, posts and orders whenever they're saved. After deploying, fill in existing records once:

```bash
npm run server:backfill-regions
```

It prints any locations it couldn't match; add those towns to `PLACE_TO_COUNTY` in `regions.js`.

### Demo analytics data

To see the dashboard with a year of realistic activity without touching real data:

```bash
MONGO_URI=mongodb://127.0.0.1:27017/farmconnect_analytics_demo npm run server:seed:analytics-demo
MONGO_URI=mongodb://127.0.0.1:27017/farmconnect_analytics_demo npm run server:start
```

Sign in to the admin as `admin@demo.farmconnect` / `password123`. The script wipes its target database, so it refuses to run unless the database name ends in `_demo`.

"Verified" is only ever set by an admin. Trust scores can promote an already-verified farmer to top-rated, but never verify anyone on their own.

`ADMIN_SECRET` is now only used by the `/api/admin/seed` endpoint.

## Notes

- Root dependencies are for the backend workspace.
- Mobile dependencies live in `client/mobile/package.json`.
- The current mobile UI is being reshaped around the ecosystem vision, not just a standalone produce marketplace.
- If a web app is introduced, it should be added as a clearly separate workspace instead of replacing the mobile flow.
