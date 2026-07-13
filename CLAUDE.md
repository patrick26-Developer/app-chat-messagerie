@AGENTS.md

# Causerie ou messagerie chat app en temps — Contexte projet pour Claude Code

## Vision

App de messagerie mobile (Expo/React Native) façon WhatsApp/Instagram/Twitter,
mais texte uniquement (pas de fichiers/documents), avec :

- Discussions privées + groupes + communautés
- Statuts éphémères (24h)
- Présence en ligne + indicateur de saisie (temps réel)
- Demandes d'amis
- Thèmes clair/sombre, plusieurs palettes de couleurs (inspirées WhatsApp/
  Instagram/Twitter mais AUCUN logo/icône de marque — uniquement lucide-react-native)
- FR/EN

Développeur : Patrick De Grâce MAKOSSO BAYONNE, fullstack (Next.js, NestJS,
Django, React Native/Expo, PostgreSQL/Prisma), niveau intermédiaire en
anglais, basé à Brazzaville.

## Stack

- Expo SDK 57 + Expo Router (structure `src/app`, PAS `app/` racine)
- NativewindUI installé mais on n'utilise PAS ses tokens de couleur
  (primary/card/popover). Palettes gérées à la main dans src/lib/theme.tsx
  via React Context, indépendamment de Tailwind.
- InstantDB (@instantdb/react-native) : base temps réel + auth magic code +
  storage fichiers (avatars uniquement)
- moti + react-native-reanimated pour les animations
- lucide-react-native pour les icônes (jamais de logos de marque)
- Émojis = caractères Unicode natifs, aucune lib
- src/lib/i18n.tsx : mini-système FR/EN maison (React Context + `t()`),
  pas de lib externe (pas i18next) — absent de la vision initiale, ajouté
  en cours de dev parce que la règle "jamais de chaîne en dur" l'exigeait
  dès les premiers écrans (auth)

## Règles de typage (non négociables)

- `strict: true` dans tsconfig, jamais désactivé
- Interdiction de `any` sauf 3 cas, et uniquement avec commentaire
  `// any justifié: <raison>` juste au-dessus :
  1. Payload externe brut non typable à la source (ex: webhook tiers)
  2. Lib sans types disponibles
  3. Contournement documenté d'un bug de types d'une dépendance
- Jamais de `as any` pour faire taire une erreur TS — une erreur TS signale
  un vrai problème de modélisation à corriger, pas à masquer.
- Types des entités dérivés du schéma Instant via `InstaQLEntity<AppSchema, 'x'>`,
  jamais dupliqués à la main dans des interfaces séparées.
- Props de composants toujours typées explicitement (pas de props implicites).

## Conventions de structure

- Code dans `src/` : `src/app` (routes), `src/lib` (logique/contexts),
  `src/components` (UI réutilisable)
- `instant.schema.ts` et `instant.perms.ts` à la racine (requis par instant-cli)
- Textes UI toujours via `useI18n()`/`t()`, jamais de chaîne en dur dans un écran
- Un commit git après chaque étape validée, jamais après plusieurs tâches empilées

## Méthode de travail avec Claude Code

- Une tâche à la fois. Ne jamais me demander "fais tout le module X" sans
  découpage préalable.
- Avant d'écrire du code sur une nouvelle fonctionnalité : d'abord proposer
  le plan (fichiers touchés, types ajoutés, impact sur le schéma), attendre
  validation, puis exécuter.
- Ne jamais introduire de nouvelle dépendance sans le dire explicitement
  dans la réponse.

## Méthodologie de test des permissions

- **`debugTransact` ne simule pas correctement les liens établis via une
  étiquette reverse fraîchement créée dans la même transaction** (ex.
  `owner`/`contact` sur `contacts`, définis forward côté `profiles` et
  reverse côté `contacts` — contrairement à une étiquette forward comme
  `sourceRequest`, qui fonctionne bien en simulation). Pour tester une
  règle `create` qui dépend de tels liens (cf. `contacts.isAcceptedByReceiver`
  dans `instant.perms.ts` pour le détail complet et les tests), utiliser
  de vrais comptes synthétiques via `db.asUser({email}).transact(...)` à
  la place — jamais `debugTransact` seul pour ce cas précis.

## Où on en est

- [X] Setup Nativewind + config Tailwind (fait)
- [X] ThemeProvider avec palettes WhatsApp/Instagram/Twitter (fait)
- [X] InstantDB : client + schéma + permissions (fait, testé sur device)
- [X] Auth magic code (fait, testé sur device : login → verify → création
      de profil)
- [X] Navigation par onglets (fait : Discussions/Statuts/Communautés/Profil)
- [X] UI primitifs réutilisables dans src/components/ui/ (Button, Input,
      Avatar, ListItem, EmptyState, Badge, ScreenContainer)
- [X] Chat individuel 1-to-1 (src/app/chat/[chatId].tsx) : envoi/réception
      temps réel, header enrichi (avatar + statut en ligne/hors ligne via
      présence), menu contact (voir profil / retirer contact / bloquer et
      partager en stub "bientôt disponible")
- [X] Groupes : création avec sélection multiple de membres
      (new-group.tsx) ; ajout de membres après coup réservé à l'admin
      (group-details.tsx liste les membres avec badge, add-group-member.tsx
      pour l'ajout) — mécanisme : `chats.adminUserIds` (JSON list de
      `$user.id`, dénormalisé depuis `memberships.role`, écrit par l'app à
      la création) permet à `chats.isAdmin` un test simple sur la ligne
      `chats` courante, sans la corrélation `data.ref()` sur `memberships`
      qui avait échoué à l'origine (cf. `instant.perms.ts`) ; validé par 9
      vérifications empiriques (admin/non-admin/inconnu, groupe/communauté/
      1-to-1) avant mise en prod, 2026-07-10
- [X] Communautés : création (new-community.tsx, isCommunity: true) +
      onglet dédié (communities.tsx) ; ajout de membres après coup par
      l'admin possible (même mécanisme que les groupes) — pas de flux
      "rejoindre" en libre-service (limitation connue, cf. section dédiée
      ci-dessous : un inconnu ne peut toujours pas se joindre lui-même)
- [X] Demandes d'amis (friend-requests.tsx, select-contact.tsx) :
      envoi/acceptation/refus, réouverture d'une demande refusée par
      l'expéditeur d'origine uniquement (limitation connue)
- [X] Contacts (entité dédiée, lignes symétriques créées à l'acceptation
      d'une demande) : liste dans select-contact.tsx, retrait depuis le
      menu contact du chat
- [X] Statuts éphémères (24h) avec vues : publication (publish-status.tsx),
      fil filtré aux contacts (statuses.tsx), compteur + écran "Vu par"
      (status-viewers.tsx)
- [X] Profil enrichi : photo (upload avatar via expo-file-system File +
      InstantDB Storage), bio, téléphone, nom affiché (edit-profile.tsx) —
      l'écran Profil principal (profile.tsx) reste volontairement minimal
      (aperçu + boutons Modifier/Déconnexion), toute la richesse est dans
      l'écran d'édition
- [X] Recherche + filtres (chips) sur Discussions (discussions.tsx) : tout/
      non lus/groupes/communautés + raccourci vers Actualités
- [X] Paramètres (settings.tsx) : thème clair/sombre/système, palette,
      langue FR/EN
- [X] Édition/suppression de message (chat/[chatId].tsx) : long-press sur
      une bulle m'appartenant → ActionSheet (Modifier/Supprimer/Annuler) ;
      modifier réutilise le TextInput de composition (bannière "Modification
      du message", update `text`+`editedAt` au lieu d'un nouveau message,
      indicateur "(modifié)" sur la bulle) ; supprimer fait un soft-delete
      (`text: ""` + `deletedAt`, confirmé par ConfirmDialog) avec placeholder
      "message supprimé" et mise à jour de `lastMessagePreview` si c'était
      le dernier message du chat ; aucun changement de permission requis
      (`messages.update`/`delete` = `isSender` couvrait déjà le cas)
      (commits 6917ed5, f5d0563, d3147df)
- [X] Actualités ("News") : fil d'annonces officielles, entité `announcements`
      dédiée SANS lien vers `profiles` (un seul auteur possible, l'admin de
      l'app, donc rien à corréler pour l'autorisation) — `title` optionnel,
      `body`, `createdAt`. Admin identifié par comparaison DIRECTE
      `auth.email` contre `src/lib/adminEmail.ts` (source unique, importée
      à la fois par `instant.perms.ts` et par l'UI), pas de champ
      `profiles.isAppAdmin` ni de système de rôles. Permission `isAppAdmin`
      testée empiriquement 8/8 (guest : rien ; non-admin authentifié : view
      seul ; admin : create/update/delete) avant d'écrire la moindre UI.
      `news.tsx` : `FlatList` triée par `createdAt` décroissant, bouton "+"
      visible seulement si l'email authentifié correspond (confort côté
      client, la vraie protection reste la permission) → `publish-
      announcement.tsx` (titre optionnel + corps requis, écriture directe
      sans `.link()`).
      **Solution temporaire avant lancement public** : cet écran mobile de
      composition est un pis-aller en attendant un futur dashboard admin
      séparé (Next.js, prévu à terme) pour la publication d'annonces et un
      contrôle plus large de l'app — reste utile pour publier depuis le
      mobile en attendant que ce dashboard existe, pas à supprimer une fois
      qu'il sera là.
- [X] Blocage de contact (chat-contact-menu.tsx + chat/[chatId].tsx) :
      libellé dynamique "Bloquer"/"Débloquer" piloté par une query
      `blocks{blocker:me, blocked:other}` (`view: isBlocker` : je ne vois
      jamais que ma propre décision de bloquer, jamais celle de l'autre —
      pas de notification) ; bloquer passe par le `ConfirmDialog` partagé,
      débloquer est une action directe ; les deux écrivent en une seule
      transaction la ligne `blocks` (créée/supprimée) ET le champ scalaire
      dénormalisé `chats.messagingBlocked` (lu par `messages.isChatNotBlocked`,
      c'est lui qui coupe réellement l'envoi des deux côtés). Composeur
      masqué pour les deux membres dès que `messagingBlocked` est vrai ;
      seul le bloqueur voit en plus une bannière ("Vous avez bloqué ce
      contact.") avec un raccourci "Débloquer". `blocks.delete` (isBlocker)
      reconfirmé empiriquement (9/9) sans check réciproque sur `profiles`
      (cf. instant.perms.ts et section Incidents).
- [X] Partage de contact (share-contact.tsx + rendu `contactCard` dans
      chat/[chatId].tsx) : écran allégé sur le pattern select-contact.tsx
      (liste "Mes contacts" uniquement, pas de recherche globale) reçoit le
      profil à partager via route params ; sélectionner un contact résout-
      ou-crée son chat 1-to-1 (`resolveOrCreateDirectChatId`, cf. Patterns
      retenus) puis y poste un message `type: "contactCard"` avec un
      snapshot (`contactCardUsername`/`DisplayName`/`AvatarPath`) du profil
      partagé — délibérément PAS de lien InstantDB vers ce profil (même
      motif que les autres liens réciproques documentés dans ce fichier :
      un lien déclencherait une vérification `profiles.update` sur un
      profil tiers). Rendu dans le fil : petite carte (avatar + nom +
      @username) via un composant dédié `ContactCardMessage` (résoudre
      l'avatar demande un hook, `renderMessage` étant appelé comme simple
      fonction par `FlatList`, pas comme un composant). Tap sur la carte :
      résout le profil ACTUEL par `contactCardUsername` (jamais le
      snapshot) avant de naviguer vers contact-details, avec une alerte de
      repli si ce profil n'existe plus. "Modifier" exclu de l'ActionSheet
      pour ce type (rien de libre à éditer), "Supprimer" inchangé.
- [ ] Notifications : rien de commencé (aucun schéma, aucune lib, aucun
      token push)

## Limitations connues (contraintes de permissions, pas de simples écrans manquants)

- **"Rejoindre" un groupe/une communauté en libre-service n'existe pas.**
  Résolu côté "un admin ajoute quelqu'un" (cf. checklist ci-dessus,
  `chats.adminUserIds`), mais aucun chemin ne permet à un inconnu de
  s'ajouter lui-même : `memberships.create` reste conditionné à être déjà
  membre du chat visé (`isGroupCoCreation`/`isOwnMembership`), ce qu'un
  inconnu n'est par définition pas. Le bouton "Nouvelle communauté" dans
  select-contact.tsx est un stub ("bientôt disponible") ; la seule création
  réelle passe par l'onglet Communautés → new-community.tsx. Piste pour un
  futur "rejoindre" en libre-service : un nouveau bind conditionné à un
  futur statut "public" sur `chats`, distinct de `isAdmin`.
- **Une demande d'ami refusée ne peut être rouverte que par l'expéditeur
  d'origine.** `isSenderReopeningDeclined` (instant.perms.ts, bloc
  `friendRequests`) ne couvre que ce sens. Si c'est le destinataire qui
  change d'avis après avoir refusé, aucun chemin n'existe pour initier une
  nouvelle demande dans l'autre sens sans reproduire le problème de lien
  réciproque déjà documenté pour `profiles`/`memberships`.
- **Le blocage peut techniquement être contourné par la personne bloquée.**
  B (le bloqué) peut techniquement écrire `chats.messagingBlocked: false`
  lui-même via `chats.update` (ouvert à `isMember`), réactivant l'envoi
  dans les deux sens SANS que la ligne `blocks` d'A soit supprimée — A
  croit toujours avoir bloqué B (menu affiche "Débloquer"), mais l'effet
  réel du blocage peut être contourné par B. Accepté pour cette itération
  (l'UI ne propose ce bouton qu'au vrai bloqueur ; un contournement
  demanderait d'écrire du code custom côté client). Piste de correctif :
  restreindre l'écriture de `messagingBlocked` au seul blocker (bind dédié,
  même famille qu'`isAdmin`).

## Sécurité — décisions connues

- npm audit signale ~11 vulnérabilités modérées via uuid<11.1.1,
  uniquement dans la chaîne d'outils Expo (xcode/config-plugins/cli), jamais
  bundlées dans l'app runtime. Confirmé le 2026-07-05. À réévaluer si
  CI/CD externe ajouté ou montée de version majeure Expo.

## Dette technique connue

- **`src/app/(tabs)/statuses.tsx:126` — accès à un ref pendant le rendu.**
  `onViewableItemsChanged` est construit via `useRef(() => { ... }).current`
  appelé directement dans le corps du composant (pas dans un effect/handler),
  ce que React interdit (`Cannot access ref value during render`, détecté
  par `eslint-config-expo`/`react-hooks` le 2026-07-13). Repéré hors scope
  du chantier blocage/partage de contact en cours — pas corrigé à cette
  occasion, à traiter séparément (probablement déplacer la construction du
  callback dans un `useCallback`/`useEffect` plutôt que `useRef`).

## Incidents

- **2026-07-13 — régression de schéma : champs encore utilisés supprimés
  par erreur lors d'un refactor de nettoyage.** Le commit `6530cad`
  ("refactor: remove unused message type and clean up schema definitions")
  a retiré de `instant.schema.ts` : `chats.adminUserIds`, `chats.messagingBlocked`,
  l'entité `blocks` entière (liens `blockBlocker`/`blockBlocked`), et
  `messages.contactCardUsername`/`contactCardDisplayName`/`contactCardAvatarPath`
  — sur la base d'un grep limité au code applicatif (`src/`), où effectivement
  rien ne les référençait encore côté UI. Mais `instant.perms.ts` les
  utilisait toujours activement : `chats.isAdmin` (`auth.id in data.adminUserIds`,
  validée par 9 vérifications empiriques le 2026-07-10, condition du flux
  "admin ajoute un membre" déjà en prod), `messages.isChatNotBlocked`
  (`data.ref('chat.messagingBlocked')`), et tout le bloc de permissions
  `blocks`. Détecté en tout début de session suivante, avant toute
  écriture de code, en comparant systématiquement `instant.schema.ts` à
  `instant.perms.ts` plutôt qu'en prenant le message du commit au mot.
  Vérifié via `npx instant-cli push schema` après restauration : "No schema
  changes to apply!" — la base InstantDB n'avait jamais reçu la version
  amputée, donc aucun impact réel côté production (mais si elle avait été
  poussée telle quelle, `isChatNotBlocked` aurait fait planter l'évaluation
  CEL sur CHAQUE envoi de message, pas juste refusé la permission).
  Corrigé par restauration à l'identique (commit `4ced7ad`), confirmée
  `git diff <commit-avant-régression> -- instant.schema.ts` vide.
  **Règle de prudence pour l'avenir** : avant de supprimer un champ, une
  entité ou un lien dans `instant.schema.ts` au prétexte qu'il est "inutilisé",
  grep son nom dans `instant.perms.ts` (pas seulement dans `src/`) — un champ
  peut n'être consommé par AUCUN écran tout en étant une condition active
  d'une règle de permission déjà en prod (denormalisation exprès pour éviter
  une corrélation `data.ref()`, cf. patterns `adminUserIds`/`messagingBlocked`
  ci-dessous). Si le grep dans `instant.perms.ts` remonte quoi que ce soit,
  ne pas supprimer sans traiter aussi le fichier de permissions dans le même
  commit.

## Patterns retenus

- **Résolution/création d'un chat 1-to-1 : helper partagé
  `resolveOrCreateDirectChatId` (`src/lib/chats.ts`), pas dupliqué par
  point d'entrée.** Cherche un chat 1-to-1 existant avec un profil cible
  (via mes propres `memberships`) et en crée un sinon (chat + 2
  memberships). Extrait de `select-contact.tsx` (nouvelle discussion) au
  moment où `share-contact.tsx` (partage de contact) en a eu besoin aussi
  — deux points d'entrée réels au moment de l'extraction, donc pas une
  abstraction prématurée. Tout futur flux qui doit "ouvrir ou créer une
  discussion 1-to-1 avec X" (ex. un futur bouton "message" depuis un profil)
  doit réutiliser ce helper plutôt que réimplémenter la recherche.

- **InstantDB Storage (`$files`) renvoie des URLs signées qui expirent**
  (~7 jours, confirmé empiriquement en décodant le paramètre `Policy` d'une
  URL réelle) — ce n'est PAS une URL publique permanente. Ne JAMAIS stocker
  cette `url` directement dans un champ persistant (`profiles.avatarUrl`
  stocke un `path`, résolu en URL fraîche à l'affichage via
  `src/lib/storage.ts` / `useResolvedAvatarUri`, consommé automatiquement
  par le composant `Avatar`). Tout futur usage du storage (ex. photo de
  statut, si ajoutée un jour) doit suivre ce même pattern : stocker le
  `path`, jamais l'`url`.
  - Compromis connu, non résolu : chaque `Avatar` affiché résout son
    `path` via sa propre requête `$files` — pas de N+1 façon REST (tout est
    multiplexé sur le même WebSocket Instant), mais une vraie souscription
    serveur distincte par `path` différent affiché à l'écran (confirmé en
    lisant `Reactor.js` : le cache de requêtes déduplique par hash exact,
    donc seulement si le même `path` est affiché plusieurs fois). Un design
    avec `i.link($files, profiles)` aurait permis d'inclure l'avatar dans
    la requête parente (ex. `discussions.tsx`) en une seule fois. Pas
    problématique à l'échelle actuelle (listes de dizaines d'items), mais à
    revisiter si des listes beaucoup plus longues apparaissent.

- **Upload de fichier client → InstantDB Storage : `new File(uri)` d'expo-file-system,
  passé tel quel, sans détour.** `db.storage.uploadFile(path, file, opts)` attend
  `File | Blob`. Sur Android/Hermes, `fetch(uri).blob()` sur un asset
  `ImagePicker` échoue avec `"Creating blobs from 'ArrayBuffer' and
  'ArrayBufferView' are not supported"` (le Blob RN ne se construit qu'à
  partir de `Blob`/`string`, jamais d'ArrayBuffer/TypedArray — confirmé en
  lisant `BlobManager.createFromParts`). Le détour base64 → URI `data:` →
  `fetch()` ne fonctionne pas non plus : `fetch()` rejette explicitement le
  schéma `data:` sur Android avec `"unknown protocol: data"` (confirmé
  empiriquement sur Pixel 9a). **Solution retenue** : l'API moderne
  `File` d'`expo-file-system` (import `from "expo-file-system"`, PAS
  `/legacy`) implémente directement l'interface `Blob` (`size`, `type`,
  `slice()`, `arrayBuffer()`, `stream()`, `text()`) — `new File(uri)` se
  passe donc directement à `uploadFile()` sans aucune conversion
  (pas de base64, pas d'URI `data:`, pas de `fetch()`). Tout futur upload
  de fichier dans l'app (ex. photo de statut, si ajoutée un jour) doit
  suivre ce chemin direct.

- **Ne jamais passer une valeur non stable (ex. `new Date()`, un
  objet/tableau littéral recréé à chaque render) directement dans l'objet
  `where` d'un `db.useQuery()`.** InstantDB hash la query (`weakHash()`)
  pour détecter les changements et décider s'il faut resouscrire ; une
  valeur qui change à chaque render (comme `new Date()` à la précision
  milliseconde — converti via `.toJSON()` dans le hash) fait resouscrire
  en boucle infinie, avec `subscribe()` qui rappelle `cb()` de façon
  synchrone à chaque (re)abonnement → **"Maximum update depth exceeded"**.
  Confirmé empiriquement (2026-07-10) sur `statuses.tsx` : `expiresAt: {
  $gt: new Date() }` inline dans la query causait ce crash sur Android,
  indépendamment de la stabilité des tableaux `$in` par ailleurs bien
  mémoïsés. Toujours mémoïser ces valeurs avec `useMemo` — dépendance
  vide `[]` pour une valeur figée au montage (ex. `useMemo(() => new
  Date(), [])`), ou une clé stable dérivée (ex. `[...tableau].sort().join(",")`
  comme dépendance, pas le tableau lui-même) pour les tableaux/objets qui
  dépendent de données live, puisqu'un `useMemo([...data])` seul ne suffit
  pas si `.data` peut changer de référence sans changement de contenu
  (heartbeat, reconnexion).

- **Champ dénormalisé `i.json<T>()` + test `in` en permission : garder une
  garde explicite contre le champ absent.** `auth.id in data.someJsonField`
  ne s'évalue PAS silencieusement à `false` quand `someJsonField` est
  `undefined` (cas normal d'un champ `.optional()` jamais renseigné, ex.
  `chats.adminUserIds` sur un chat 1-to-1 ou un groupe pas encore
  backfillé) — ça fait carrément échouer toute la requête HTTP avec une
  erreur d'évaluation CEL ("No matching overload for function '@in'"),
  confirmé empiriquement le 2026-07-10 en construisant `chats.isAdmin`.
  Toujours écrire `data.champJson != null && auth.id in data.champJson`,
  jamais le test `in` seul, dès qu'un champ `i.json` est `.optional()`.

- **SDK admin (`@instantdb/admin`) : les liens to-one ne sont PAS dépliés
  en objet unique**, contrairement au SDK client (`db.useQuery()` côté
  React Native, typé via `InstaQLEntity` qui aplatit un lien "has one" en
  objet direct). Un script Node utilisant `db.query()` de `@instantdb/admin`
  reçoit `profile`/`$user`/etc. sous forme de **tableau** (`[{...}]`) même
  pour une relation to-one du schéma — confirmé empiriquement le
  2026-07-10 en écrivant `scripts/backfill-admin-user-ids.mjs` (bug
  silencieux au premier essai : `membership.profile?.$user?.id` renvoyait
  toujours `undefined`, la bonne forme étant `membership.profile?.[0]?.$user?.[0]?.id`).
  Tout futur script admin (migration, backfill) qui traverse un lien
  imbriqué doit s'attendre à cette forme, pas à celle du SDK client.
