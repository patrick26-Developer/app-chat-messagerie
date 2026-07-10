// Backfill ponctuel : remplit chats.adminUserIds ($user.id du membre
// role:"admin") pour tous les groupes/communautés créés avant l'ajout de
// ce champ dénormalisé. Sans ça, ces chats restent bloqués — aucun admin
// identifiable, donc la règle chats.isAdmin échoue toujours pour eux.
// Idempotent : ignore les chats qui ont déjà un adminUserIds non vide.
//
// Usage : node scripts/backfill-admin-user-ids.mjs
import { init, tx } from "@instantdb/admin";
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

const { chats } = await db.query({
  chats: {
    $: { where: { isGroup: true } },
    memberships: { profile: { $user: {} } },
  },
});

const updates = [];
const skippedAlreadySet = [];
const skippedNoAdmin = [];

for (const chat of chats) {
  if (Array.isArray(chat.adminUserIds) && chat.adminUserIds.length > 0) {
    skippedAlreadySet.push(chat.id);
    continue;
  }

  // Le SDK admin ne "déplie" PAS les liens to-one en objet unique comme le
  // fait InstaQLEntity côté client (db.useQuery()) : `profile`/`$user`
  // reviennent en tableau brut ([{...}]), même pour une relation "has one"
  // du schéma. Confirmé empiriquement en inspectant le JSON brut renvoyé
  // par db.query() ici (jamais remarqué avant : aucun script admin
  // n'avait encore traversé un lien to-one imbriqué dans ce projet).
  const adminUserIds = (chat.memberships ?? [])
    .filter((membership) => membership.role === "admin")
    .map((membership) => membership.profile?.[0]?.$user?.[0]?.id)
    .filter((userId) => Boolean(userId));

  if (adminUserIds.length === 0) {
    skippedNoAdmin.push({ chatId: chat.id, name: chat.name, isCommunity: chat.isCommunity ?? false });
    continue;
  }

  updates.push(tx.chats[chat.id].update({ adminUserIds }));
}

if (updates.length > 0) {
  await db.transact(updates);
}

console.log(`Chats groupe/communauté trouvés : ${chats.length}`);
console.log(`Backfillés : ${updates.length}`);
console.log(`Déjà à jour (ignorés) : ${skippedAlreadySet.length}`);
if (skippedNoAdmin.length > 0) {
  console.log(`ATTENTION — aucun membre role:"admin" trouvé (à investiguer manuellement) :`);
  console.log(JSON.stringify(skippedNoAdmin, null, 2));
}
