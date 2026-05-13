# Seeding Demo Data On Render Free

FarmConnect already has a seed command:

```bash
npm run server:seed
```

The seed script connects to `MONGO_URI` and inserts realistic Kenyan demo data: users, marketplace listings, feed posts, community threads, orders, notifications, and seller remarks.

The normal seed command is non-destructive. It looks for existing demo records first and only creates records that are missing, so your existing users and organic app data stay in place.

## Important Safety Note

`npm run server:seed` does not reset the database.

There is also an explicit reset command:

```bash
npm run server:seed:reset
```

That reset command deletes existing users, products, posts, orders, comments, notifications, and related data before inserting fresh data.

Use `npm run server:seed:reset` only for:

- a new demo database
- a staging database
- a portfolio/demo deployment
- resetting test data after UI testing

Do not run the reset command against real customer data.

## Best Render Free Workflow

Render free web services do not support shell access or one-off jobs. The simplest reliable workflow is to run the seed command from your local machine while pointing `MONGO_URI` at the same MongoDB database used by Render.

1. Open Render dashboard.
2. Open the `farmconnect-api` service.
3. Go to `Environment`.
4. Copy the value of `MONGO_URI`.
5. Put that same value in your local root `.env`.
6. Make sure `JWT_SECRET` is also set locally.
7. Run:

```bash
npm run server:seed
```

Because the seed script uses the `MONGO_URI` from `.env`, it will seed the hosted MongoDB database even though the command runs on your laptop.

## After Seeding

Restart the Render service or open the app and refresh the API views. The mobile app should now show fuller marketplace, feed, community, order, notification, and profile data.

## Demo Login Accounts

Every seeded account uses:

```text
password123
```

Useful accounts:

```text
amina@farmconnect.app
kamau@farmconnect.app
wanjiku@farmconnect.app
lemook@farmconnect.app
agrivet@farmconnect.app
ahero@farmconnect.app
brian@farmconnect.app
```
