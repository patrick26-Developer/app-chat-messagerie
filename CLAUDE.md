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
