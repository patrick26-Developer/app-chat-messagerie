import { i, type InstaQLEntity } from "@instantdb/react-native";
import type { ColorSchemePreference, PaletteName } from "@/lib/theme";

export type MembershipRole = "admin" | "member";
export type FriendRequestStatus = "pending" | "accepted" | "declined";
export type MessageType = "text" | "system" | "contactCard";

const _schema = i.schema({
  entities: {
    $users: i.entity({
      email: i.string().unique().indexed(),
    }),
    // Namespace système géré par Instant (storage). `path`/`url` déclarés
    // uniquement pour le TYPAGE de lecture (`where: { path }`, lire
    // `$files.url`) — l'écriture reste de toute façon bloquée par la
    // validation interne d'Instant (confirmé empiriquement : un
    // `.update({ path })` générique échoue avec "Missing required
    // attribute $files/location-id/size", pas une erreur de permission —
    // même famille de protection que `$users.email`). Seul le vrai
    // endpoint `db.storage.uploadFile()` peut créer une ligne `$files`.
    $files: i.entity({
      path: i.string(),
      url: i.string(),
    }),
    profiles: i.entity({
      displayName: i.string(),
      username: i.string().unique().indexed(),
      avatarUrl: i.string().optional(),
      bio: i.string().optional(),
      phone: i.string().optional().indexed(),
      lastSeenAt: i.date(),
      createdAt: i.date(),
      paletteName: i.string<PaletteName>(),
      colorSchemePreference: i.string<ColorSchemePreference>(),
    }),
    chats: i.entity({
      name: i.string().optional(),
      avatarUrl: i.string().optional(),
      description: i.string().optional(),
      isGroup: i.boolean(),
      isCommunity: i.boolean().optional(),
      createdAt: i.date(),
      lastMessageAt: i.date(),
      lastMessagePreview: i.string(),
      // Dénormalisé depuis memberships.role (maintenu par l'app, jamais lu
      // depuis memberships côté permissions) : contient des $user.id (pas
      // des profile.id), pour que la règle `chats.isAdmin` reste un test
      // simple sur cette ligne (`auth.id in data.adminUserIds`), sans
      // corrélation data.ref() sur la collection to-many `memberships` —
      // cf. faille isAdmin documentée dans instant.perms.ts. Optionnel :
      // les chats créés avant l'introduction de ce champ sont backfillés
      // séparément (cf. scripts/backfill-admin-user-ids.ts).
      adminUserIds: i.json<string[]>().optional(),
      // Dénormalisé également (même logique qu'adminUserIds) : maintenu par
      // l'app au blocage/déblocage, pour que `messages.isChatNotBlocked`
      // reste un test scalaire sur le chat courant (un seul hop to-one
      // message -> chat), plutôt qu'une corrélation data.ref() à deux hops
      // to-many (chat -> memberships -> profile -> blockedProfiles) jamais
      // testée dans ce projet — cf. instant.perms.ts pour le détail.
      // Uniquement pertinent pour les chats 1-to-1 (jamais posé sur un
      // groupe/communauté, le blocage n'a pas d'effet là — décision produit).
      messagingBlocked: i.boolean().optional(),
    }),
    memberships: i.entity({
      role: i.string<MembershipRole>(),
      joinedAt: i.date(),
      lastReadAt: i.date(),
      muted: i.boolean(),
    }),
    messages: i.entity({
      text: i.string(),
      type: i.string<MessageType>().optional(),
      createdAt: i.date(),
      editedAt: i.date().optional(),
      deletedAt: i.date().optional(),
      // Carte de contact partagée (type "contactCard") : snapshot au moment
      // du partage, PAS de lien InstantDB vers le profil partagé — un lien
      // déclencherait une vérification profiles.update réciproque sur un
      // profil tiers (même piège que isBeingAddedToChat/
      // isBeingAddedAsFriendRequestParty). L'écran résout le profil ACTUEL
      // via contactCardUsername au moment de l'ouverture, pas ces champs.
      contactCardUsername: i.string().optional(),
      contactCardDisplayName: i.string().optional(),
      contactCardAvatarPath: i.string().optional(),
    }),
    statuses: i.entity({
      content: i.string(),
      backgroundColor: i.string().optional(),
      createdAt: i.date(),
      expiresAt: i.date().indexed(),
    }),
    statusViews: i.entity({
      viewedAt: i.date(),
    }),
    friendRequests: i.entity({
      status: i.string<FriendRequestStatus>(),
      note: i.string().optional(),
      createdAt: i.date(),
    }),
    contacts: i.entity({
      createdAt: i.date(),
    }),
    // Blocage : une ligne par blocage, à sens unique (contrairement à
    // `contacts` qui crée 2 lignes symétriques) — bloquer B n'implique pas
    // que B bloque A. `blocker`/`blocked` sont des étiquettes FORWARD
    // définies directement sur `blocks` (pas reverse comme `owner`/
    // `contact` sur `contacts`), donc fiables en simulation debugTransact
    // (cf. section "Méthodologie de test des permissions" dans CLAUDE.md).
    blocks: i.entity({
      createdAt: i.date(),
    }),
  },
  links: {
    profileUser: {
      forward: { on: "profiles", has: "one", label: "$user" },
      reverse: { on: "$users", has: "one", label: "profile" },
    },
    chatMemberships: {
      forward: { on: "chats", has: "many", label: "memberships" },
      reverse: { on: "memberships", has: "one", label: "chat" },
    },
    profileMemberships: {
      forward: { on: "profiles", has: "many", label: "memberships" },
      reverse: { on: "memberships", has: "one", label: "profile" },
    },
    chatMessages: {
      forward: { on: "chats", has: "many", label: "messages" },
      reverse: { on: "messages", has: "one", label: "chat" },
    },
    profileMessages: {
      forward: { on: "profiles", has: "many", label: "sentMessages" },
      reverse: { on: "messages", has: "one", label: "sender" },
    },
    statusOwner: {
      forward: { on: "profiles", has: "many", label: "statuses" },
      reverse: { on: "statuses", has: "one", label: "owner" },
    },
    statusViewsOfStatus: {
      forward: { on: "statuses", has: "many", label: "views" },
      reverse: { on: "statusViews", has: "one", label: "status" },
    },
    statusViewViewer: {
      forward: { on: "profiles", has: "many", label: "statusViews" },
      reverse: { on: "statusViews", has: "one", label: "viewer" },
    },
    friendRequestFrom: {
      forward: { on: "profiles", has: "many", label: "sentFriendRequests" },
      reverse: { on: "friendRequests", has: "one", label: "from" },
    },
    friendRequestTo: {
      forward: { on: "profiles", has: "many", label: "receivedFriendRequests" },
      reverse: { on: "friendRequests", has: "one", label: "to" },
    },
    contactOwner: {
      forward: { on: "profiles", has: "many", label: "contacts" },
      reverse: { on: "contacts", has: "one", label: "owner" },
    },
    contactPeer: {
      forward: { on: "profiles", has: "many", label: "contactedBy" },
      reverse: { on: "contacts", has: "one", label: "contact" },
    },
    contactSourceRequest: {
      forward: { on: "contacts", has: "one", label: "sourceRequest" },
      reverse: { on: "friendRequests", has: "many", label: "resultingContacts" },
    },
    blockBlocker: {
      forward: { on: "blocks", has: "one", label: "blocker" },
      reverse: { on: "profiles", has: "many", label: "blockedProfiles" },
    },
    blockBlocked: {
      forward: { on: "blocks", has: "one", label: "blocked" },
      reverse: { on: "profiles", has: "many", label: "blockedByProfiles" },
    },
  },
  rooms: {
    // Room globale unique pour la présence en ligne (pas persisté en base,
    // typage client uniquement — cf. src/lib/presence.ts).
    presence: {
      presence: i.entity({
        profileId: i.string(),
        online: i.boolean(),
      }),
    },
  },
});

// Contourne "type instantiation is excessively deep" sur les gros schémas Instant.
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}

const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;

export type UserEntity = InstaQLEntity<AppSchema, "$users">;
export type Profile = InstaQLEntity<AppSchema, "profiles">;
export type Chat = InstaQLEntity<AppSchema, "chats">;
export type Membership = InstaQLEntity<AppSchema, "memberships">;
export type Message = InstaQLEntity<AppSchema, "messages">;
export type Status = InstaQLEntity<AppSchema, "statuses">;
export type StatusView = InstaQLEntity<AppSchema, "statusViews">;
export type FriendRequest = InstaQLEntity<AppSchema, "friendRequests">;
export type Contact = InstaQLEntity<AppSchema, "contacts">;
export type Block = InstaQLEntity<AppSchema, "blocks">;
