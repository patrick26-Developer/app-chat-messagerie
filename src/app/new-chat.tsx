import { useState } from "react";
import { Pressable, ScrollView, Text } from "react-native";
import { Stack, useRouter } from "expo-router";
import { UserPlus } from "lucide-react-native";
import { id } from "@instantdb/react-native";
import { Avatar, EmptyState, Input, ListItem, ScreenContainer } from "@/components/ui";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { useOnlineProfileIds } from "@/lib/presence";
import { useOwnProfile } from "@/lib/profile";
import { useTheme } from "@/lib/theme";
import type { Profile } from "../../instant.schema";

export default function NewChatScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { profile: myProfile } = useOwnProfile();
  const onlineIds = useOnlineProfileIds();

  const [query, setQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const trimmedQuery = query.trim();

  const searchQuery = db.useQuery(
    myProfile && trimmedQuery.length > 0
      ? {
          profiles: {
            $: {
              where: {
                id: { $ne: myProfile.id },
                or: [{ username: { $ilike: `%${trimmedQuery}%` } }, { phone: { $ilike: `%${trimmedQuery}%` } }],
              },
            },
          },
        }
      : null,
  );

  const results = searchQuery.data?.profiles ?? [];

  const sentRequestsQuery = db.useQuery(
    myProfile
      ? { friendRequests: { $: { where: { "from.id": myProfile.id } }, from: {}, to: {} } }
      : null,
  );
  const receivedRequestsQuery = db.useQuery(
    myProfile
      ? { friendRequests: { $: { where: { "to.id": myProfile.id } }, from: {}, to: {} } }
      : null,
  );
  const friendRequests = [
    ...(sentRequestsQuery.data?.friendRequests ?? []),
    ...(receivedRequestsQuery.data?.friendRequests ?? []),
  ];
  type FriendRequestWithParties = (typeof friendRequests)[number];

  function findRelationship(targetId: string): FriendRequestWithParties | undefined {
    return friendRequests.find(
      (request) =>
        (request.from?.id === myProfile?.id && request.to?.id === targetId) ||
        (request.from?.id === targetId && request.to?.id === myProfile?.id),
    );
  }

  async function handleSendFriendRequest(targetProfile: Profile, existingRequest: FriendRequestWithParties | undefined) {
    if (!myProfile) return;
    if (existingRequest && existingRequest.status === "declined" && existingRequest.from?.id === myProfile.id) {
      // Réouverture d'une demande que j'avais moi-même envoyée et qui a été
      // refusée : on réutilise la même ligne (status -> pending) plutôt que
      // d'en créer une seconde. Surtout ne PAS rappeler .link({from, to})
      // ici : from/to ne changent pas, et Instant traite quand même une
      // ré-assertion identique comme une modification réciproque du profil
      // visé, ce qui casse la permission (cf. commentaire dans
      // instant.perms.ts sur `isSenderReopeningDeclined`).
      await db.transact(db.tx.friendRequests[existingRequest.id].update({ status: "pending" }));
      return;
    }
    await db.transact(
      db.tx.friendRequests[id()]
        .update({ status: "pending", createdAt: new Date().toISOString() })
        .link({ from: myProfile.id, to: targetProfile.id }),
    );
  }

  async function handleSelect(targetProfile: Profile) {
    if (!myProfile || isCreating) return;
    setIsCreating(true);
    try {
      const existing = await db.queryOnce({
        memberships: {
          $: { where: { "profile.id": myProfile.id } },
          chat: {
            memberships: { profile: {} },
          },
        },
      });

      const existingChat = existing.data.memberships
        .map((membership) => membership.chat)
        .find(
          (chat) =>
            chat && !chat.isGroup && chat.memberships?.some((member) => member.profile?.id === targetProfile.id),
        );

      if (existingChat) {
        router.replace({ pathname: "/chat/[chatId]", params: { chatId: existingChat.id } });
        return;
      }

      const chatId = id();
      const now = new Date().toISOString();

      await db.transact([
        db.tx.chats[chatId].update({ isGroup: false, createdAt: now, lastMessageAt: now, lastMessagePreview: "" }),
        db.tx.memberships[id()]
          .update({ role: "member", joinedAt: now, lastReadAt: now, muted: false })
          .link({ chat: chatId, profile: myProfile.id }),
        db.tx.memberships[id()]
          .update({ role: "member", joinedAt: now, lastReadAt: now, muted: false })
          .link({ chat: chatId, profile: targetProfile.id }),
      ]);

      router.replace({ pathname: "/chat/[chatId]", params: { chatId } });
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <ScreenContainer className="px-4 pt-4">
      <Stack.Screen
        options={{
          headerShown: true,
          presentation: "modal",
          headerTitle: t("newChat.title"),
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />
      <Input
        value={query}
        onChangeText={setQuery}
        placeholder={t("newChat.searchPlaceholder")}
        autoCapitalize="none"
        autoCorrect={false}
        containerClassName="mb-2"
      />
      {trimmedQuery.length > 0 && results.length === 0 && !searchQuery.isLoading ? (
        <EmptyState title={t("newChat.noResults")} />
      ) : (
        <ScrollView>
          {results.map((result) => {
            const relationship = findRelationship(result.id);
            const canSendOrReopen =
              !relationship || (relationship.status === "declined" && relationship.from?.id === myProfile?.id);

            return (
              <ListItem
                key={result.id}
                leading={
                  <Avatar uri={result.avatarUrl} name={result.displayName} size={44} online={onlineIds.has(result.id)} />
                }
                title={result.displayName}
                subtitle={`@${result.username}`}
                onPress={() => handleSelect(result)}
                trailing={
                  canSendOrReopen ? (
                    <Pressable onPress={() => handleSendFriendRequest(result, relationship)} hitSlop={8}>
                      <UserPlus color={colors.accent} size={20} />
                    </Pressable>
                  ) : (
                    <Text className="text-xs" style={{ color: colors.textMuted }}>
                      {relationship?.status === "accepted" ? t("newChat.alreadyContacts") : relationship?.status === "declined" ? t("newChat.requestDeclined") : t("newChat.requestPending")}
                    </Text>
                  )
                }
              />
            );
          })}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}
