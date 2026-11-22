import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * The same security headers Render serves for the live dashboard (see render.yaml, farmconnect-admin).
 * `npm run preview` sends them too, so a change can be checked locally before it reaches the live site.
 * Keep the two lists in step; only this one also allows the local API (http://localhost:8000).
 */
const securityHeaders = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' blob: https:; connect-src 'self' https://*.onrender.com http://localhost:8000; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Robots-Tag": "noindex, nofollow",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
  },
  preview: {
    port: 5174,
    headers: securityHeaders,
  },
});
