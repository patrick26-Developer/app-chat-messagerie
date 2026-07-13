import { i, type InstaQLEntity } from "@instantdb/react-native";
import type { ColorSchemePreference, PaletteName } from "@/lib/theme";

export type MembershipRole = "admin" | "member";
export type FriendRequestStatus = "pending" | "accepted" | "declined";
export type MessageType = "text" | "system";

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
