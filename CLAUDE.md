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
- [ ] Écrans métier restants : chat individuel, statuts, communautés,
      demandes d'amis (Discussions n'a pour l'instant que la liste, pas
      l'écran de conversation ; Profil est basique)

## Sécurité — décisions connues

- npm audit signale ~11 vulnérabilités modérées via uuid<11.1.1,
  uniquement dans la chaîne d'outils Expo (xcode/config-plugins/cli), jamais
  bundlées dans l'app runtime. Confirmé le 2026-07-05. À réévaluer si
  CI/CD externe ajouté ou montée de version majeure Expo.

## Patterns retenus

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
