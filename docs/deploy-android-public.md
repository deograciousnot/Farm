# FarmConnect Public Android Build

This is the production-ish path for an APK that works away from the developer machine.

## 1. Create A Hosted MongoDB Database

Create a MongoDB Atlas cluster and copy its connection string. Use that value for `MONGO_URI` on the API host.

After the API can connect, seed the hosted database once:

```powershell
$env:MONGO_URI="mongodb+srv://..."
$env:JWT_SECRET="use-a-long-random-secret"
npm run server:seed
```

## 2. Deploy The API

Create a Render web service from this repo, or use the `render.yaml` blueprint.

Use these commands:

```text
Build command: npm install
Start command: npm run server:start
Health check path: /api/health
```

Set these environment variables in Render:

```text
NODE_ENV=production
MONGO_URI=<MongoDB Atlas connection string>
JWT_SECRET=<long random secret>
JWT_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=<Cloudinary cloud name>
CLOUDINARY_API_KEY=<Cloudinary API key>
CLOUDINARY_API_SECRET=<Cloudinary API secret>
```

When deploy finishes, test:

```powershell
Invoke-WebRequest https://<render-service>.onrender.com/api/health
```

## 3. Point EAS Builds At The Public API

Set the mobile build-time API URL in EAS:

```powershell
npx eas-cli@latest env:create --environment preview --visibility plaintext --name EXPO_PUBLIC_API_URL --value https://<render-service>.onrender.com
```

Then build a shareable APK:

```powershell
npm run build:apk
```

The app code appends `/api`, so the EAS value should be the API origin only, without `/api`.
