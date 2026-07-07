import type { InstantRules } from "@instantdb/react-native";
import type { AppSchema } from "./instant.schema";

const rules = {
  $default: {
    allow: {
      view: "false",
      create: "false",
      update: "false",
      delete: "false",
    },
  },

  // Ajout (bug confirmé en test réel sur device, 2026-07-06) : `profiles[id]
  // .update(...).link({ $user: userId })` échouait avec "Permission denied:
  // not perms-pass? on input ["$users","object"]" lors de la création du
  // profil au premier login magic code. Cause : `$users` est un namespace
  // managé par Instant avec des règles par défaut intégrées, INDÉPENDANTES
  // de `$default` (view: auth.id==data.id, create: true, update: false,
  // delete: false) — le `create: true` implicite explique pourquoi la
  // création du $user lors du magic code fonctionnait déjà, mais le
  // `update: false` implicite bloquait l'établissement du lien retour
  // (`$users.profile`) déclenché par le `.link()` côté `profiles`.
  //
  // `update` est restreint à son propre `$user` (`auth.id == data.id`,
  // comparaison directe sur le même row, pas de `data.ref()` donc aucun
  // risque de corrélation comme pour `chats.isAdmin`).
  //
  // Correction (2026-07-06, après remise en question justifiée) : un
  // premier essai ajoutait `fields: { email: "false" }` en pensant que ça
  // bloquerait l'ÉCRITURE de `email`. Testé empiriquement avec
  // @instantdb/admin + `db.asUser()` et c'est FAUX sur les deux plans :
  // 1. `fields` contrôle la VISIBILITÉ en lecture, pas l'écriture — avec
  //    `fields.email: "false"`, `db.asUser({email}).query({ $users: {} })`
  //    renvoyait la ligne SANS le champ `email`, même pour l'utilisateur
  //    propriétaire de sa propre ligne (régression : on ne pourrait plus
  //    lire son propre email). Retiré.
  // 2. La tentative d'écriture (`db.tx.$users[id].update({ email: ... })`)
  //    était de toute façon rejetée AVANT même d'atteindre nos règles de
  //    permission, avec l'erreur "$users.email is a system column. You
  //    aren't allowed to change this directly." — une validation Instant
  //    au niveau schéma, inconditionnelle, indépendante de ce qu'on écrit
  //    dans ce fichier. `fields.email: "false"` n'apportait donc aucune
  //    protection d'écriture supplémentaire : `email` est déjà immuable en
  //    écriture directe quoi qu'on fasse ici.
  // Si un jour on ajoute un vrai champ personnalisé sur `$users` à protéger
  // en écriture (pas un system column géré par Instant), le mécanisme
  // documenté est `request.modifiedFields` dans l'expression `update`
  // elle-même (ex. `"isOwner && !('champ' in request.modifiedFields)")`),
  // pas `fields`.
  $users: {
    allow: {
      view: "auth.id != null && auth.id == data.id",
      create: "true",
      update: "auth.id != null && auth.id == data.id",
      delete: "false",
    },
  },

  profiles: {
    bind: {
      isOwner: "auth.id != null && auth.id in data.ref('$user.id')",
    },
    allow: {
      view: "true",
      create: "isOwner",
      update: "isOwner",
      delete: "isOwner",
    },
  },

  // Correction (revue post-implémentation) : `update`/`delete` étaient ouverts à
  // `isMember`, ce qui permettait à n'importe quel membre (pas seulement un admin)
  // de modifier ou supprimer un groupe entier. `delete` reste à "false" : aucune
  // suppression de chat entier n'est prévue — quitter un groupe passe uniquement
  // par la suppression de sa propre `membership` (cf. section "logique
  // applicative" de l'ancien PLAN_SCHEMA.md).
  //
  // FAILLE CONFIRMÉE EMPIRIQUEMENT (2026-07-05, via script de test avec
  // @instantdb/admin : deux $users de test, un chat avec une membership
  // role='admin' et une membership role='member') : une tentative de bind
  // `isAdmin` combinant deux `data.ref()` distincts sur la collection to-many
  // `memberships` — `auth.id in data.ref('memberships.profile.$user.id')
  // && 'admin' in data.ref('memberships.role')` — a été TESTÉE et a ÉCHOUÉ :
  // le membre non-admin a réussi à faire l'update (`db.asUser({email:
  // memberEmail}).transact(...)` n'a pas levé d'erreur de permission). Preuve
  // que `data.ref()` ne corrèle pas les deux chemins ligne par ligne : dès
  // qu'un chat a UN admin (n'importe lequel), tous ses membres passent le test
  // `'admin' in data.ref('memberships.role')`, indépendamment de leur propre rôle.
  //
  // Décision : `update` passe à "false" en attendant une vraie solution.
  // Piste retenue pour plus tard : dénormaliser un champ directement sur
  // `chats` (ex. `adminUserIds: i.json<string[]>()`), maintenu par l'app à
  // chaque changement de rôle dans `memberships`, pour que la règle devienne
  // un simple test sur un champ de la ligne courante (`auth.id in
  // data.adminUserIds`) au lieu d'une corrélation sur une relation to-many.
  chats: {
    bind: {
      isMember: "auth.id != null && auth.id in data.ref('memberships.profile.$user.id')",
    },
    allow: {
      view: "isMember",
      create: "isMember",
      update: "false",
      delete: "false",
    },
  },

  memberships: {
    bind: {
      isOwnMembership: "auth.id != null && auth.id in data.ref('profile.$user.id')",
      isMemberOfChat: "auth.id != null && auth.id in data.ref('chat.memberships.profile.$user.id')",
    },
    allow: {
      view: "isMemberOfChat",
      create: "isOwnMembership",
      update: "isOwnMembership",
      delete: "isOwnMembership",
    },
  },

  // Correction (revue post-implémentation) : `create` était restreint à `isMember`
  // seul, ce qui n'empêchait pas un membre du chat de créer un message dont le
  // lien `sender` pointe vers le profil de quelqu'un d'autre (usurpation
  // d'identité dans le fil de discussion). `create` exige maintenant `isMember`
  // ET `isSender` (l'expéditeur lié au message doit être l'utilisateur authentifié
  // lui-même), en plus d'être membre du chat.
  messages: {
    bind: {
      isMember: "auth.id != null && auth.id in data.ref('chat.memberships.profile.$user.id')",
      isSender: "auth.id != null && auth.id in data.ref('sender.$user.id')",
    },
    allow: {
      view: "isMember",
      create: "isMember && isSender",
      update: "isSender",
      delete: "isSender",
    },
  },

  statuses: {
    bind: {
      isOwner: "auth.id != null && auth.id in data.ref('owner.$user.id')",
    },
    allow: {
      view: "isOwner",
      create: "isOwner",
      update: "isOwner",
      delete: "isOwner",
    },
  },

  statusViews: {
    bind: {
      isViewer: "auth.id != null && auth.id in data.ref('viewer.$user.id')",
      isStatusOwner: "auth.id != null && auth.id in data.ref('status.owner.$user.id')",
    },
    allow: {
      view: "isViewer || isStatusOwner",
      create: "isViewer",
      update: "false",
      delete: "false",
    },
  },

  friendRequests: {
    bind: {
      isSender: "auth.id != null && auth.id in data.ref('from.$user.id')",
      isReceiver: "auth.id != null && auth.id in data.ref('to.$user.id')",
    },
    allow: {
      view: "isSender || isReceiver",
      create: "isSender",
      update: "isReceiver",
      delete: "isSender || isReceiver",
    },
  },
} satisfies InstantRules<AppSchema>;

export default rules;
