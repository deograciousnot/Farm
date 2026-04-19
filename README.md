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
|  \- mobile/   Primary Expo mobile app
|- server/      Shared Express backend
|- package.json Root scripts for the workspace
\- README.md    Product and architecture overview
```

## Commands

From the repo root:

```bash
npm run server
npm run client
npm run android
npm run ios
npm run web
npm run lint:mobile
```

## Notes

- Root dependencies are for the backend workspace.
- Mobile dependencies live in `client/mobile/package.json`.
- The current mobile UI is being reshaped around the ecosystem vision, not just a standalone produce marketplace.
- If a web app is introduced, it should be added as a clearly separate workspace instead of replacing the mobile flow.
