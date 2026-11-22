/**
 * Checks an Africa's Talking username + API key pair without sending a text: it asks for the
 * account balance, which only works when the pair matches. Reads at-check.env in the repo root
 * (git-ignored). Prints whether the pair works and the balance; never prints the key.
 *
 *   node server/scripts/check-africastalking.js
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const file = path.join(root, "at-check.env");

if (!fs.existsSync(file)) {
  console.error("at-check.env not found in the repo root.");
  process.exit(1);
}

const values = {};
for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
  const match = line.match(/^\s*(AT_USERNAME|AT_API_KEY)\s*=(.*)$/);
  if (match) values[match[1]] = match[2];
}

const rawUser = values.AT_USERNAME ?? "";
const rawKey = values.AT_API_KEY ?? "";
const username = rawUser.trim();
const apiKey = rawKey.trim();

if (!username || !apiKey) {
  console.error("Fill in both AT_USERNAME and AT_API_KEY in at-check.env, then run this again.");
  process.exit(1);
}

if (rawUser !== username || rawKey !== apiKey) {
  console.log("Note: there were spaces around a value. They're ignored here, but make sure Render has none.");
}

console.log(`Username: "${username}"  ·  key: ${apiKey.length} characters, starts "${apiKey.slice(0, 4)}…"`);

if (username === "sandbox") {
  console.log("This is the sandbox username. Sandbox texts never reach real phones; use your live app's username.");
}

const host = username === "sandbox" ? "api.sandbox.africastalking.com" : "api.africastalking.com";
const response = await fetch(`https://${host}/version1/user?username=${encodeURIComponent(username)}`, {
  headers: { apiKey, Accept: "application/json" },
});
const text = await response.text();

if (response.ok) {
  let balance = "unknown";
  try {
    balance = JSON.parse(text).UserData?.balance ?? balance;
  } catch {}
  console.log(`WORKS: Africa's Talking accepted this pair. Balance: ${balance}`);
  console.log("Copy these exact two values to Render (farmconnect-api -> Environment).");
} else {
  console.log(`REJECTED: HTTP ${response.status} ${text.slice(0, 200)}`);
  if (response.status === 401) {
    console.log("The key doesn't belong to this username. Generate a new key inside the app whose username this is.");
  }
}
