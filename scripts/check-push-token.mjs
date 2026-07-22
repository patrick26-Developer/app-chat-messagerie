// Vérification ponctuelle : profiles.pushTokens contient-il bien le token
// Expo obtenu par useRegisterPushToken pour mb.patrickdegrace@gmail.com ?
// Usage : node scripts/check-push-token.mjs
import { init } from "@instantdb/admin";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(projectRoot, ".env"), "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split("=")),
);

const db = init({
  appId: env.EXPO_PUBLIC_INSTANT_APP_ID,
  adminToken: env.INSTANT_APP_ADMIN_TOKEN,
});

const { profiles } = await db.query({
  profiles: {
    $: { where: { "$user.email": "mb.patrickdegrace@gmail.com" } },
    $user: {},
  },
});

console.log(JSON.stringify(profiles, null, 2));
