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

  // Ajout (chat direct 1-to-1) : établir le lien memberships<->profiles
  // depuis la transaction d'A déclenche une vérification `profiles.update`
  // sur le profil de B (pas seulement `memberships.create`), parce
  // qu'Instant traite l'établissement d'un lien comme une modification des
  // DEUX entités liées. Confirmé via `debugTransact` (2026-07-07) : sans ce
  // bind, la transaction entière échouait avec check-pass?:false sur
  // `profiles` (eid = profil de B), alors que la vérification
  // `memberships.create` passait, elle, correctement.
  //
  // `isBeingAddedToChat` : `request.modifiedFields` doit contenir
  // UNIQUEMENT 'memberships' — confirmé via `debugTransact` que ce champ
  // apparaît seul dans ce cas précis (aucun autre champ du profil ne peut
  // être touché par la même opération).
  //
  // Tentative initiale rejetée : je voulais aussi re-vérifier ici même
  // (chat non-groupe, ≤ 2 memberships) via `newData.ref('memberships.chat
  // ...')`. Erreur reçue du backend : "No matching overload for function
  // 'ref'. Overload candidates: _ref" — `newData.ref()` n'existe pas dans
  // le DSL Instant, seul `data.ref()` est supporté. Décision : ne pas
  // dupliquer cette vérification ici, elle est déjà faite correctement
  // ailleurs (voir `isDirectChatCoCreation` sur `memberships`, qui corrèle
  // sans problème car `membership.chat` est cardinalité "one" — pas la
  // même relation to-many que celle qui avait fait échouer `chats.isAdmin`).
  // Comme les deux checks (celui-ci ET celui de la membership créée) doivent
  // passer ensemble pour que la transaction entière réussisse, la portée
  // volontairement plus étroite ici (uniquement la liste des champs) reste
  // sûre : impossible de satisfaire ce bind seul sans que la création de
  // la membership elle-même passe aussi son propre test de corrélation.
  //
  // Testé empiriquement avant de pousser, via `debugTransact` avec override
  // des règles (donc sans jamais toucher la prod avant confirmation) :
  // (1) A crée un chat direct avec B (chat + 2 memberships) → réussit.
  // (2) A tente de modifier displayName de B directement → échoue.
  // (2b) A tente de modifier avatarUrl de B directement → échoue.
  // (3) A tente de s'ajouter comme 3ᵉ membre à un chat 1-to-1 déjà existant
  //     entre B et C → échoue (bloqué par `chats.update`, qui rejette toute
  //     modification du champ `memberships` sur un chat déjà existant —
  //     protection incidente mais efficace, en plus du garde-fou
  //     `isDirectChatCoCreation` côté `memberships`).
  // Ajout (2026-07-08) : bug préexistant découvert PENDANT le travail sur
  // la fonctionnalité "contacts" (sans rapport direct avec elle) — en
  // testant si une nouvelle friendRequest peut être renvoyée après
  // suppression d'un contact, `debugTransact` a révélé que
  // `friendRequests.create` échoue TOUJOURS en prod aujourd'hui pour toute
  // demande vers un destinataire différent de soi-même. Cause : établir
  // le lien `.link({ from, to })` touche réciproquement
  // `profiles.sentFriendRequests` (expéditeur) ET
  // `profiles.receivedFriendRequests` (destinataire) — même mécanique déjà
  // documentée pour `memberships`/`messages`/`contacts` ailleurs dans ce
  // fichier. Pour l'expéditeur (auth), `isOwner` couvre déjà le cas
  // (n'importe quel champ modifié sur son propre profil passe). Pour le
  // DESTINATAIRE (pas auth), ni `isOwner` ni `isBeingAddedToChat` (qui ne
  // couvre que le champ `'memberships'`) ne s'appliquaient — confirmé via
  // `debugTransact` avec les règles EXACTES alors en prod : check
  // `profiles.update` sur le destinataire → check-pass?:false,
  // modified-fields:["receivedFriendRequests"].
  //
  // `isBeingAddedAsFriendRequestParty` comble ce trou, même famille que
  // `isBeingAddedToChat`.
  //
  // Testé empiriquement avant de pousser (voir résultats donnés à
  // l'utilisateur) :
  // (1) A envoie une demande à B (profils différents, aucune relation
  //     existante) → réussit désormais.
  // (2a) C tente de modifier `displayName` de A directement (sans lien
  //      friendRequest dans la même transaction) → toujours bloqué.
  // (2b) C envoie une VRAIE demande à A (touche légitimement
  //      `receivedFriendRequests`) mais glisse aussi une modification de
  //      `displayName` dans la même transaction → toujours bloqué dans son
  //      ensemble (`.all(f, ...)` rejette dès qu'un champ hors liste
  //      apparaît, peu importe qu'un autre champ de la même transaction
  //      soit légitime).
  // (3) Après suppression d'une friendRequest existante (cf. flux "retirer
  //     un contact"), renvoyer une nouvelle demande → réussit.
  profiles: {
    bind: {
      isOwner: "auth.id != null && auth.id in data.ref('$user.id')",
      isBeingAddedToChat:
        "auth.id != null && size(request.modifiedFields) == 1 && 'memberships' in request.modifiedFields",
      isBeingAddedAsFriendRequestParty:
        "auth.id != null && request.modifiedFields.all(f, f in ['sentFriendRequests', 'receivedFriendRequests'])",
      // Ajout (2026-07-08, fonctionnalité "contacts") : créer les 2 lignes
      // symétriques `contacts` à l'acceptation d'une friendRequest touche
      // réciproquement `profiles.contacts` (label owner) ET
      // `profiles.contactedBy` (label contact) sur LES DEUX profils
      // impliqués — même mécanique que `isBeingAddedToChat`/
      // `isBeingAddedAsFriendRequestParty`. Confirmé via `debugTransact`
      // (test 2 de la série "contacts") : les deux profils voient
      // modified-fields=["contacts","contactedBy"].
      isBeingAddedAsContact:
        "auth.id != null && request.modifiedFields.all(f, f in ['contacts', 'contactedBy'])",
    },
    allow: {
      view: "true",
      create: "isOwner",
      update: "isOwner || isBeingAddedToChat || isBeingAddedAsFriendRequestParty || isBeingAddedAsContact",
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
  // `update` rouvert (était "false" après la faille isAdmin) mais restreint
  // via `request.modifiedFields` aux deux seuls champs que l'envoi d'un
  // message doit pouvoir toucher (lastMessageAt/lastMessagePreview) — le
  // renommage du groupe (name/avatarUrl/isGroup) reste bloqué pour tout le
  // monde tant qu'un vrai `isAdmin` fiable n'existe pas.
  // À VÉRIFIER EMPIRIQUEMENT : `request.modifiedFields` jamais testé contre
  // le backend réel dans ce projet.
  //
  // Limitations connues à traiter plus tard :
  // - `update` restreint à `lastMessageAt`/`lastMessagePreview`/`messages`
  //   bloque toujours, par effet de bord, toute tentative de LIER une
  //   nouvelle MEMBERSHIP à un chat déjà existant — même légitime (ex.
  //   rejoindre une communauté via invitation). Confirmé en testant le
  //   point 1 ci-dessus (2026-07-07) : lier une membership à un chat
  //   déclenche une vérification `chats.update` sur le champ
  //   `memberships`, qui échoue puisque `memberships` n'est pas dans la
  //   liste des champs autorisés. À résoudre quand on construira le flux
  //   "rejoindre un groupe/une communauté" — probablement en ajoutant
  //   `'memberships'` à la liste des champs autorisés dans `chats.update`,
  //   sous des conditions à définir (`isCommunity == true` et/ou un statut
  //   "public" du groupe, pour ne pas rouvrir la possibilité de s'ajouter
  //   à un 1-to-1 privé déjà existant — cf. le test 3 qui vérifie
  //   précisément ce cas).
  //
  // Correction (2026-07-08) : bug DIFFÉRENT de celui anticipé ci-dessus,
  // découvert en conditions réelles sur device (pas en test admin) lors
  // de l'ENVOI D'UN MESSAGE, pas de la création de chat. La création du
  // chat 1-to-1 avait bien réussi (confirmé en lisant les vraies données :
  // chat + 2 memberships existantes) ; c'est `handleSend()` dans
  // `chat/[chatId].tsx` qui échouait. Cause identique en nature à celle
  // documentée juste au-dessus pour `memberships`, mais appliquée à
  // `messages` : lier un nouveau message au chat (`.link({ chat: ... })`)
  // modifie réciproquement le champ `chats.messages`, en plus de l'update
  // explicite de `lastMessageAt`/`lastMessagePreview` fait dans la même
  // transaction. Confirmé via `debugTransact` reproduisant exactement la
  // transaction de `handleSend()` sur les vraies données (vrai chat id,
  // vrai profile id, vrai compte via `db.asUser`) :
  //   chats.update -> check-pass?=false
  //   modified-fields: ['messages', 'lastMessageAt', 'lastMessagePreview']
  // `'messages'` n'étant pas dans la liste autorisée, `.all(...)` échouait
  // et rejetait toute la transaction (alors que `messages.create` et
  // `profiles.update` passaient très bien individuellement).
  // `'messages'` ajouté à la liste, toujours conditionné à `isMember`
  // (donc uniquement un membre du chat peut faire apparaître ce champ
  // dans `modifiedFields`, jamais un étranger). Testé empiriquement avant
  // de pousser (voir résultats donnés à l'utilisateur) : (1) envoi normal
  // entre les 2 comptes réels → réussit désormais ; (2) un membre tente de
  // lier un message appartenant à un AUTRE chat vers celui-ci → échoue
  // (bloqué par `messages.update = isSender`, qui reste inchangé) ; (3) un
  // non-membre du chat → toujours bloqué par `isMember`.
  chats: {
    bind: {
      isMember: "auth.id != null && auth.id in data.ref('memberships.profile.$user.id')",
    },
    allow: {
      view: "isMember",
      create: "isMember",
      update: "isMember && request.modifiedFields.all(f, f in ['lastMessageAt', 'lastMessagePreview', 'messages'])",
      delete: "false",
    },
  },

  // Ajout (chat direct 1-to-1, pas d'étape d'acceptation) : créer une
  // discussion suppose de créer MA membership ET celle de l'autre personne
  // dans la même transaction — `isOwnMembership` seul ne l'autorise pas.
  // `isDirectChatCoCreation` couvre exactement ce cas : je suis déjà membre
  // du chat (via ma propre membership créée dans la même transaction),
  // le chat n'est pas un groupe, ET il ne compte pas plus de 2 memberships
  // (le `size(...) <= 2` empêche qu'un membre d'un 1-to-1 existant ajoute
  // furtivement une 3ᵉ personne plus tard — sans ça, la règle resterait
  // ouverte indéfiniment, pas seulement à la création).
  //
  // À VÉRIFIER EMPIRIQUEMENT avant de considérer ça fiable : `size()` sur
  // un `data.ref()` n'a jamais été testé contre le backend Instant réel
  // dans ce projet (contrairement à `in`, déjà confirmé fonctionnel pour
  // `isAdmin`/`isMember` ailleurs dans ce fichier).
  // Ajout (2026-07-08, "Nouveau groupe") : `isDirectChatCoCreation` exige
  // `isGroup == false` ET `size(...) <= 2`, donc bloque par construction la
  // création d'un groupe (isGroup vrai, potentiellement N > 2 membres dès
  // la création). `isGroupCoCreation` couvre ce cas séparément plutôt que
  // d'assouplir `isDirectChatCoCreation` (qui doit rester strictement
  // limité au 1-to-1, avec son plafond à 2).
  //
  // Contrairement à `isDirectChatCoCreation`, PAS de plafond de taille ici
  // — un groupe peut être créé avec un nombre arbitraire de memberships
  // initiales. Ce n'est pas un trou : la protection "pas d'ajout a
  // posteriori" ne vient de toute façon PAS de ce bind, elle vient de
  // `chats.update` (ci-dessus), qui rejette toute modification touchant le
  // champ `memberships` sur un chat déjà existant — découvert avec le test
  // 3 de la série précédente (A tente de s'ajouter comme 3ᵉ membre à un
  // chat 1-to-1 existant, bloqué par `chats.update`, pas par
  // `isDirectChatCoCreation`). Le même mécanisme s'applique tel quel à un
  // groupe : `chats.create` ne se déclenche qu'une seule fois dans la vie
  // d'un chat, donc toute tentative de lier une membership à un groupe qui
  // existe déjà bascule automatiquement sur `chats.update` (restreint),
  // jamais sur `chats.create` — pas besoin de vérifier la taille ici pour
  // obtenir cette distinction "création vs. plus tard".
  //
  // MISE EN GARDE pour un futur correctif : si `chats.update` est un jour
  // élargi pour autoriser `'memberships'` (pour résoudre la limitation déjà
  // documentée "rejoindre une communauté existante"), ça rouvrirait aussi,
  // silencieusement, la possibilité d'ajouter des gens à un GROUPE existant
  // — pas seulement à une communauté — sauf si ce futur correctif est
  // conditionné précisément (`isCommunity == true` uniquement, pas les
  // groupes en général). Ne pas élargir `chats.update` sans revérifier cet
  // impact sur `isGroupCoCreation`.
  //
  // Testé empiriquement avant de pousser (voir résultats donnés à
  // l'utilisateur) : (1) création d'un groupe à 3+ memberships en une
  // transaction → réussit ; (2) un non-invité tente de s'ajouter après
  // coup → échoue ; (3) un membre non-admin légitimement co-créé tente
  // d'ajouter quelqu'un plus tard → échoue aussi ; (4) régression 1-to-1
  // toujours fonctionnelle ; (6) envoi de message dans un chat de groupe
  // (pas seulement 1-to-1) → réussit, jamais testé avant ce tour-ci.
  memberships: {
    bind: {
      isOwnMembership: "auth.id != null && auth.id in data.ref('profile.$user.id')",
      isMemberOfChat: "auth.id != null && auth.id in data.ref('chat.memberships.profile.$user.id')",
      isDirectChatCoCreation:
        "auth.id != null && auth.id in data.ref('chat.memberships.profile.$user.id') && false in data.ref('chat.isGroup') && size(data.ref('chat.memberships.id')) <= 2",
      isGroupCoCreation:
        "auth.id != null && auth.id in data.ref('chat.memberships.profile.$user.id') && true in data.ref('chat.isGroup')",
    },
    allow: {
      view: "isMemberOfChat",
      create: "isOwnMembership || isDirectChatCoCreation || isGroupCoCreation",
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

  // Ajout (2026-07-08) : `view` était limité à `isOwner` uniquement, avec
  // une note documentant que corréler "auth est un contact du owner" via
  // `data.ref()` sur une relation to-many n'avait jamais été testé et
  // risquait de reproduire le bug `isAdmin` (corrélation ligne par ligne
  // non fiable sur `data.ref()`). La nouvelle entité `contacts` (une ligne
  // par relation confirmée, cf. bloc `contacts` plus bas) permet une
  // vérification à chemin UNIQUE, du même type que `chats.isMember`
  // (`data.ref('memberships.profile.$user.id')`), donc sans ce risque de
  // corrélation.
  //
  // `isContact` : chaîne à 4 hops (owner → contacts → contact → $user →
  // id), jamais testée à cette profondeur dans ce projet (le précédent
  // maximum confirmé était 3 hops). Testé empiriquement avant de pousser
  // (voir résultats donnés à l'utilisateur) : (7) B, contact confirmé de
  // A, voit le statut de A → réussit ; régression : A voit toujours son
  // propre statut. (8) C, sans relation de contact avec A, ne voit pas
  // son statut → bloqué.
  statuses: {
    bind: {
      isOwner: "auth.id != null && auth.id in data.ref('owner.$user.id')",
      isContact: "auth.id != null && auth.id in data.ref('owner.contacts.contact.$user.id')",
    },
    allow: {
      view: "isOwner || isContact",
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

  // Ajout (2026-07-08) : permettre à l'expéditeur d'origine de rouvrir sa
  // propre demande refusée (status declined -> pending) pour changer d'avis
  // plus tard, en réutilisant la MÊME ligne plutôt que d'en créer une
  // seconde — évite d'avoir besoin d'une contrainte d'unicité en base sur
  // la paire (from, to).
  //
  // `isSenderReopeningDeclined` restreint ça au strict nécessaire :
  // - `data.status == 'declined'` (accès scalaire direct, PAS `data.ref()` —
  //   ce n'est pas un lien, juste un champ de la ligne courante) : ne
  //   s'applique qu'à une demande déjà refusée, jamais à une `pending` ou
  //   `accepted` existante.
  // - `newData.status == 'pending'` (accès scalaire direct sur `newData`,
  //   PAS `newData.ref()` — ce dernier n'existe pas dans le DSL Instant,
  //   déjà découvert et documenté pour `profiles.isBeingAddedToChat` ;
  //   mais l'accès à un champ scalaire simple sur `newData`, lui, fonctionne
  //   très bien, testé ci-dessous) : empêche l'expéditeur d'utiliser cette
  //   réouverture pour s'auto-accepter (`declined` -> `accepted` directement)
  //   — il ne peut remettre le statut qu'à `pending`, jamais `accepted`.
  //
  // IMPORTANT découvert en testant : réutiliser la ligne ne doit PAS
  // rappeler `.link({ from, to })` avec les mêmes valeurs qu'avant, même
  // si elles ne changent pas "vraiment" — Instant traite quand même ça
  // comme une modification réciproque du profil visé (même phénomène déjà
  // documenté pour `chats`/`memberships`/`messages` plus haut dans ce
  // fichier), ce qui déclenche un `profiles.update` qui échoue puisque
  // `profiles.isBeingAddedToChat` ne couvre que le cas des memberships,
  // pas des friendRequests. Le code applicatif (`new-chat.tsx`) ne doit donc
  // reformuler QUE `status` sur la ligne existante, jamais retoucher
  // `from`/`to` s'ils ne changent pas réellement.
  //
  // Testé empiriquement avant de pousser, via `debugTransact` (comptes de
  // test synthétiques, pas les vrais comptes) :
  // (1) A (expéditeur d'origine) rouvre sa demande refusée vers B (status
  //     seul, sans re-`.link()`) → réussit.
  // (2) A tente d'exploiter ce chemin pour passer directement à `accepted`
  //     → échoue (bloqué par `newData.status == 'pending'`).
  // (3) B (destinataire) accepte normalement une demande pending fraîche
  //     → réussit toujours (non régressé).
  // (4) Un tiers C tente de modifier la demande entre A et B → échoue
  //     toujours (non régressé).
  //
  // Limitation connue à traiter plus tard : seul l'expéditeur d'origine (A)
  // peut rouvrir une demande refusée via `isSenderReopeningDeclined`. Si
  // c'est le DESTINATAIRE (B) qui change d'avis après avoir refusé, il n'a
  // actuellement aucun moyen d'initier une nouvelle demande dans l'autre
  // sens — permuter `from`/`to` sur la même ligne reproduirait le problème
  // de lien réciproque sur `profiles` déjà rencontré (cf. commentaire
  // ci-dessus et celui au-dessus du bloc `memberships`/`chats` sur
  // `isBeingAddedToChat`). À résoudre plus tard, probablement en
  // élargissant `isBeingAddedToChat` ou un bind équivalent sur
  // `friendRequests` pour couvrir aussi ce cas d'inversion.
  friendRequests: {
    bind: {
      isSender: "auth.id != null && auth.id in data.ref('from.$user.id')",
      isReceiver: "auth.id != null && auth.id in data.ref('to.$user.id')",
      isSenderReopeningDeclined:
        "auth.id != null && auth.id in data.ref('from.$user.id') && data.status == 'declined' && newData.status == 'pending'",
    },
    allow: {
      view: "isSender || isReceiver",
      create: "isSender",
      update: "isReceiver || isSenderReopeningDeclined",
      delete: "isSender || isReceiver",
    },
  },

  // Ajout (2026-07-08, entité "contacts") : remplace le pari abandonné sur
  // `statuses.view` (corrélation `data.ref()` non fiable sur une relation
  // to-many, cf. commentaire sur `isAdmin` plus haut) par une entité
  // dédiée — une ligne par relation confirmée, avec un chemin de lecture
  // UNIQUE (pas de corrélation entre deux champs de la même relation).
  //
  // Design : 2 lignes SYMÉTRIQUES créées ensemble à l'acceptation d'une
  // friendRequest ({owner:A, contact:B} ET {owner:B, contact:A}), plutôt
  // qu'une seule ligne canonique — permet à `statuses.isContact` de lire
  // via un chemin unique (`owner.contacts.contact.$user.id`), du même
  // style que `chats.isMember`, au lieu d'un OR de deux chaînes à 3+ hops
  // chacune (jamais utilisé dans ce projet, risque jugé inutile).
  //
  // `isPartOfContact` : auth est l'un des deux profils de la ligne
  // (`owner` OU `contact`) — utilisé pour `view`/`delete`, permet à
  // N'IMPORTE LAQUELLE des deux parties de voir ou de retirer le contact,
  // même si elle n'est que `contact` (pas `owner`) sur cette ligne précise.
  //
  // `isAcceptedByReceiver` : restreint la création aux lignes réellement
  // justifiées par une friendRequest acceptée dont l'auteur de la
  // transaction est le DESTINATAIRE (`sourceRequest.to`), ET dont les deux
  // profils de la ligne (`owner`/`contact`) correspondent exactement aux
  // deux extrémités de cette même demande (`from`/`to`, dans un sens ou
  // l'autre) — sans cette dernière clause, un receveur légitime pourrait
  // exploiter SA PROPRE demande acceptée pour fabriquer un faux contact
  // entre deux tiers sans rapport (faille réelle, confirmée en test avant
  // correction, cf. ci-dessous).
  //
  // MÉTHODOLOGIE DE TEST — écart par rapport au protocole habituel :
  // `debugTransact` s'est avéré RENDRE INVISIBLES, dans les bindings
  // simulés, les liens établis via une étiquette reverse (`owner`/
  // `contact`, définis forward côté `profiles` et reverse côté `contacts`)
  // fraîchement créés DANS LA MÊME transaction simulée — confirmé en
  // dumpant les bindings bruts (`owner`/`contact` absents de `new-data`,
  // alors que `sourceRequest`, une étiquette forward définie directement
  // sur `contacts`, y apparaît correctement). La même transaction, via un
  // vrai `db.transact()`, persiste et résout `owner`/`contact`
  // parfaitement (vérifié par requête directe). Plusieurs formulations
  // CEL de la corrélation ont d'abord semblé toutes échouer de façon
  // incohérente selon l'ordre des appels `debugTransact` — la cause
  // réelle n'était PAS la syntaxe CEL mais cette limitation de
  // `debugTransact` pour ce cas précis (lien reverse + création dans la
  // même transaction simulée).
  //
  // En conséquence, la validation de `create` (et uniquement `create`) a
  // été faite via de VRAIS `db.asUser({email}).transact(...)` avec des
  // comptes synthétiques (pas `debugTransact`) — un refus de permission
  // ne commite rien, donc sans risque. `view`/`delete` restent validés
  // via `debugTransact` sur des lignes déjà réellement commitées
  // (aucune limitation dans ce cas, confirmé).
  //
  // Testé empiriquement avant de pousser (voir résultats donnés à
  // l'utilisateur) :
  // (1) création symétrique des 2 lignes par B (receiver) → réussit.
  // (2) modified-fields sur les 2 profils → ["contacts","contactedBy"].
  // (3) B tente aussi de modifier displayName de A dans la même
  //     transaction → toute la transaction échoue.
  // (5b) B exploite SA PROPRE demande acceptée (sans rapport avec A) pour
  //      fabriquer un contact entre A et un tiers → échoue désormais
  //      (confirmé via vrai `asUser().transact()`, après correction).
  // (1/2 légitimes, sens direct ET inverse) → réussissent toujours après
  //      correction (régression vérifiée).
  // (6) tiers hors paire : view/create/delete sur un contact entre A et B
  //     → bloqué sur les trois.
  // (9) suppression par l'une ou l'autre partie, qu'elle soit `owner` OU
  //     `contact` sur la ligne → réussit dans les deux cas.
  // (11) la suppression ne déclenche PAS de vérification réciproque sur
  //      `profiles` (contrairement à la création) — confirmé.
  //
  // Suppression d'un contact : supprime aussi la friendRequest d'origine
  // (perte de la trace from/to, jugée acceptable — pas d'écran d'audit
  // dans cette app) plutôt que d'introduire un nouveau statut — `delete`
  // sur `friendRequests` est déjà ouvert à `isSender || isReceiver`,
  // aucune permission supplémentaire requise pour ce flux.
  contacts: {
    bind: {
      isPartOfContact:
        "auth.id != null && (auth.id in data.ref('owner.$user.id') || auth.id in data.ref('contact.$user.id'))",
      isAcceptedByReceiver:
        "auth.id != null && auth.id in data.ref('sourceRequest.to.$user.id') && 'accepted' in data.ref('sourceRequest.status') && ((data.ref('owner.id') == data.ref('sourceRequest.from.id') && data.ref('contact.id') == data.ref('sourceRequest.to.id')) || (data.ref('owner.id') == data.ref('sourceRequest.to.id') && data.ref('contact.id') == data.ref('sourceRequest.from.id')))",
    },
    allow: {
      view: "isPartOfContact",
      create: "isAcceptedByReceiver",
      update: "false",
      delete: "isPartOfContact",
    },
  },

  // Ajout (2026-07-08, upload d'avatar) : `$files` n'avait aucune règle —
  // `$default` (fermé) s'appliquait, personne ne pouvait upload/lire/
  // supprimer un fichier depuis le client. Namespace déclaré vide dans
  // instant.schema.ts (`$files: i.entity({})`) — nécessaire pour que
  // TypeScript accepte cette clé ici (confirmé : sans ça, erreur
  // "Object literal may only specify known properties, and '$files' does
  // not exist in type ..."), poussée séparément et confirmée être un no-op
  // côté backend ("No schema changes to apply!" — le namespace système
  // existait déjà, seule notre typage local en avait besoin).
  //
  // Convention : chaque fichier est uploadé sous `<auth.id>/...` (le
  // `$user.id`, pas le profile id — directement disponible sans
  // `data.ref()`, donc aucun risque de corrélation). `isOwnPath` restreint
  // create/delete à son propre dossier.
  //
  // `view: "true"` — cohérent avec `profiles.view = true` déjà public : un
  // avatar doit être chargeable par n'importe qui, y compris quelqu'un qui
  // ne connaît le fichier de personne d'autre que par son `path` (vu dans
  // une réponse `$files` publique précédente).
  //
  // `.startsWith()` : jamais utilisé dans ce projet avant ce tour-ci (on
  // avait utilisé `==`, `in`, `size()`, `.all()`). Testé empiriquement (voir
  // résultats donnés à l'utilisateur) avant de considérer ça fiable.
  //
  // Découverte IMPORTANTE en testant (pas une question de permissions) :
  // `$files.url` renvoyé par une query est une URL SIGNÉE avec expiration
  // (~7 jours, décodée depuis le paramètre `Policy`), pas une URL publique
  // permanente. Donc `profiles.avatarUrl` ne doit PAS stocker cette `url`
  // telle quelle (elle expirerait) — elle stocke le `path` à la place, et
  // l'app résout une URL fraîche à l'affichage (cf. `src/lib/storage.ts`
  // et le composant `Avatar`, modifiés en conséquence).
  //
  // Testé empiriquement avant de pousser :
  // (1) forme réelle de `$files` en lecture (path/url confirmés, url
  //     signée avec expiration — découverte ci-dessus).
  // (2) `data.path.startsWith(...)` fonctionne bien dans le DSL Instant.
  // (3) upload par le propriétaire vers son propre dossier → réussit.
  // (4) upload par un tiers vers le dossier d'un autre → échoue.
  // (5) lecture publique d'un fichier existant → réussit.
  // (6) suppression par le propriétaire de son propre fichier → réussit.
  // (7) suppression par un tiers du fichier d'un autre → échoue.
  // (7b) un tiers qui connaît le `path` exact d'un autre (vu via une
  //      réponse `$files` publique) tente de le supprimer quand même →
  //      échoue, `isOwnPath` ne dépend que de l'auteur de la requête, pas
  //      de la connaissance du chemin.
  // (8) ré-upload au même `path` → comportement confirmé (écrase ou non).
  $files: {
    bind: {
      isOwnPath: "auth.id != null && data.path.startsWith(auth.id + '/')",
    },
    allow: {
      view: "true",
      create: "isOwnPath",
      update: "false",
      delete: "isOwnPath",
    },
  },
} satisfies InstantRules<AppSchema>;

export default rules;
