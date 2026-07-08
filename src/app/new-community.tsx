import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import { id } from "@instantdb/react-native";
import { Avatar, Button, EmptyState, Input, ListItem, ScreenContainer } from "@/components/ui";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { useOwnProfile } from "@/lib/profile";
import { useTheme } from "@/lib/theme";
import type { Profile } from "../../instant.schema";

export default function NewCommunityScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { profile: myProfile } = useOwnProfile();

  const [query, setQuery] = useState("");
  const [communityName, setCommunityName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Profile[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const trimmedQuery = query.trim();
  const trimmedName = communityName.trim();

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

  function toggleSelected(profile: Profile) {
    setSelected((current) =>
      current.some((p) => p.id === profile.id) ? current.filter((p) => p.id !== profile.id) : [...current, profile],
    );
  }

  const canCreate = trimmedName.length > 0 && !isCreating;

  async function handleCreate() {
    if (!myProfile || !canCreate) return;
    setIsCreating(true);
    try {
      const chatId = id();
      const now = new Date().toISOString();

      await db.transact([
        db.tx.chats[chatId].update({
          isGroup: true,
          isCommunity: true,
          name: trimmedName,
          description: description.trim() || undefined,
          createdAt: now,
          lastMessageAt: now,
          lastMessagePreview: "",
        }),
        db.tx.memberships[id()]
          .update({ role: "admin", joinedAt: now, lastReadAt: now, muted: false })
          .link({ chat: chatId, profile: myProfile.id }),
        ...selected.map((profile) =>
          db.tx.memberships[id()]
            .update({ role: "member", joinedAt: now, lastReadAt: now, muted: false })
            .link({ chat: chatId, profile: profile.id }),
        ),
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
          headerTitle: t("newCommunity.title"),
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />
      <Input
        value={communityName}
        onChangeText={setCommunityName}
        placeholder={t("newCommunity.namePlaceholder")}
        containerClassName="mb-2"
      />
      <Input
        value={description}
        onChangeText={setDescription}
        placeholder={t("newCommunity.descriptionPlaceholder")}
        multiline
        containerClassName="mb-2"
      />
      <Input
        value={query}
        onChangeText={setQuery}
        placeholder={t("newGroup.searchPlaceholder")}
        autoCapitalize="none"
        autoCorrect={false}
        containerClassName="mb-2"
      />
      {selected.length > 0 ? (
        <Text className="mb-2 text-xs" style={{ color: colors.textSecondary }}>
          {t("newGroup.selectedCount", { count: String(selected.length) })}
        </Text>
      ) : null}

      {trimmedQuery.length > 0 && results.length === 0 && !searchQuery.isLoading ? (
        <EmptyState title={t("newChat.noResults")} />
      ) : (
        <ScrollView className="flex-1">
          {results.map((result) => {
            const isSelected = selected.some((p) => p.id === result.id);
            return (
              <ListItem
                key={result.id}
                leading={<Avatar uri={result.avatarUrl} name={result.displayName} size={44} />}
                title={result.displayName}
                subtitle={`@${result.username}`}
                onPress={() => toggleSelected(result)}
                trailing={isSelected ? <Check color={colors.accent} size={20} /> : undefined}
              />
            );
          })}
        </ScrollView>
      )}

      <Button label={t("newGroup.create")} onPress={handleCreate} disabled={!canCreate} loading={isCreating} />
    </ScreenContainer>
  );
}
