import { id } from "@instantdb/react-native";
import { db } from "./db";

/**
 * Retrouve le chat 1-to-1 existant avec `targetProfileId`, ou en crée un
 * (chat + 2 memberships) sinon. Partagé entre select-contact.tsx (nouvelle
 * discussion) et share-contact.tsx (partage de contact vers un contact).
 */
export async function resolveOrCreateDirectChatId(myProfileId: string, targetProfileId: string): Promise<string> {
  const existing = await db.queryOnce({
    memberships: {
      $: { where: { "profile.id": myProfileId } },
      chat: { memberships: { profile: {} } },
    },
  });

  const existingChat = existing.data.memberships
    .map((membership) => membership.chat)
    .find((chat) => chat && !chat.isGroup && chat.memberships?.some((member) => member.profile?.id === targetProfileId));

  if (existingChat) return existingChat.id;

  const chatId = id();
  const now = new Date().toISOString();

  await db.transact([
    db.tx.chats[chatId].update({ isGroup: false, createdAt: now, lastMessageAt: now, lastMessagePreview: "" }),
    db.tx.memberships[id()]
      .update({ role: "member", joinedAt: now, lastReadAt: now, muted: false })
      .link({ chat: chatId, profile: myProfileId }),
    db.tx.memberships[id()]
      .update({ role: "member", joinedAt: now, lastReadAt: now, muted: false })
      .link({ chat: chatId, profile: targetProfileId }),
  ]);

  return chatId;
}
