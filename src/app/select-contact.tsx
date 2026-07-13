import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { UserCheck, UserPlus, Users } from "lucide-react-native";
import { id } from "@instantdb/react-native";
import { Avatar, EmptyState, Input, ListItem, ScreenContainer } from "@/components/ui";
import { resolveOrCreateDirectChatId } from "@/lib/chats";
import { db } from "@/lib/db";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { useOnlineProfileIds } from "@/lib/presence";
import { useOwnProfile } from "@/lib/profile";
import { useTheme } from "@/lib/theme";
import type { Profile } from "../../instant.schema";

type ActionRow = {
  key: string;
  Icon: typeof Users;
  labelKey: TranslationKey;
  route?: "/new-group" | "/friend-requests";
};

const ACTION_ROWS: ActionRow[] = [
  { key: "newGroup", Icon: Users, labelKey: "discussions.menu.newGroup", route: "/new-group" },
  { key: "newCommunity", Icon: Users, labelKey: "selectContact.newCommunity" },
  { key: "friendRequests", Icon: UserCheck, labelKey: "discussions.menu.friendRequests", route: "/friend-requests" },
];

export default function SelectContactScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { profile: myProfile } = useOwnProfile();
  const onlineIds = useOnlineProfileIds();

  const [query, setQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length > 0;

  const contactsQuery = db.useQuery(myProfile ? { contacts: { $: { where: { owner: myProfile.id } }, contact: {} } } : null);
  const contacts = contactsQuery.data?.contacts ?? [];

  const searchQuery = db.useQuery(
    myProfile && isSearching
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
    myProfile ? { friendRequests: { $: { where: { "from.id": myProfile.id } }, from: {}, to: {} } } : null,
  );
  const receivedRequestsQuery = db.useQuery(
    myProfile ? { friendRequests: { $: { where: { "to.id": myProfile.id } }, from: {}, to: {} } } : null,
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
      // Réouverture d'une demande refusée que j'avais envoyée : on réutilise
      // la même ligne (status -> pending), sans rappeler .link({from, to})
      // (cf. commentaire sur `isSenderReopeningDeclined` dans instant.perms.ts).
      await db.transact(db.tx.friendRequests[existingRequest.id].update({ status: "pending" }));
      return;
    }
    await db.transact(
      db.tx.friendRequests[id()]
        .update({ status: "pending", createdAt: new Date().toISOString() })
        .link({ from: myProfile.id, to: targetProfile.id }),
    );
  }

  async function openOrCreateDirectChat(targetProfile: Profile) {
    if (!myProfile || isCreating) return;
    setIsCreating(true);
    try {
      const chatId = await resolveOrCreateDirectChatId(myProfile.id, targetProfile.id);
      router.replace({ pathname: "/chat/[chatId]", params: { chatId } });
    } finally {
      setIsCreating(false);
    }
  }

  function handleActionPress(action: ActionRow) {
    if (action.route) {
      router.push(action.route);
      return;
    }
    // "Nouvelle communauté" depuis ce hub : pas encore d'écran dédié à ce
    // parcours (la création de communauté se fait pour l'instant depuis
    // l'onglet Communautés).
    Alert.alert(t(action.labelKey), t("common.comingSoon"));
  }

  return (
    <ScreenContainer className="px-4 pt-4">
      <Stack.Screen
        options={{
          headerShown: true,
          presentation: "modal",
          headerTitle: t("selectContact.title"),
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />
      <Text className="mb-3 text-sm" style={{ color: colors.textSecondary }}>
        {t("selectContact.contactsCount", { count: String(contacts.length) })}
      </Text>
      <Input
        value={query}
        onChangeText={setQuery}
        placeholder={t("newChat.searchPlaceholder")}
        autoCapitalize="none"
        autoCorrect={false}
        containerClassName="mb-2"
      />

      {isSearching ? (
        trimmedQuery.length > 0 && results.length === 0 && !searchQuery.isLoading ? (
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
                  onPress={() => openOrCreateDirectChat(result)}
                  trailing={
                    canSendOrReopen ? (
                      <Pressable onPress={() => handleSendFriendRequest(result, relationship)} hitSlop={8}>
                        <UserPlus color={colors.accent} size={20} />
                      </Pressable>
                    ) : (
                      <Text className="text-xs" style={{ color: colors.textMuted }}>
                        {relationship?.status === "accepted"
                          ? t("newChat.alreadyContacts")
                          : relationship?.status === "declined"
                            ? t("newChat.requestDeclined")
                            : t("newChat.requestPending")}
                      </Text>
                    )
                  }
                />
              );
            })}
          </ScrollView>
        )
      ) : (
        <ScrollView>
          {ACTION_ROWS.map((action) => (
            <ListItem
              key={action.key}
              leading={<action.Icon color={colors.accent} size={20} />}
              title={t(action.labelKey)}
              onPress={() => handleActionPress(action)}
            />
          ))}

          <View className="mb-1 mt-4">
            <Text className="text-xs font-semibold uppercase" style={{ color: colors.textSecondary }}>
              {t("selectContact.myContacts")}
            </Text>
          </View>

          {contacts.length === 0 ? (
            <Text className="px-1 py-2 text-sm" style={{ color: colors.textMuted }}>
              {t("selectContact.noContactsYet")}
            </Text>
          ) : (
            contacts.map((row) =>
              row.contact ? (
                <ListItem
                  key={row.id}
                  leading={
                    <Avatar
                      uri={row.contact.avatarUrl}
                      name={row.contact.displayName}
                      size={44}
                      online={onlineIds.has(row.contact.id)}
                    />
                  }
                  title={row.contact.displayName}
                  subtitle={`@${row.contact.username}`}
                  onPress={() => openOrCreateDirectChat(row.contact as Profile)}
                />
              ) : null,
            )
          )}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}
