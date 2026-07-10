import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import { id } from "@instantdb/react-native";
import { Avatar, Button, EmptyState, Input, ListItem, ScreenContainer } from "@/components/ui";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { useOwnProfile } from "@/lib/profile";
import { useTheme } from "@/lib/theme";
import type { Profile } from "../../instant.schema";

export default function AddGroupMemberScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const { profile: myProfile } = useOwnProfile();

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Profile[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const trimmedQuery = query.trim();

  const chatQuery = db.useQuery(chatId ? { chats: { $: { where: { id: chatId } }, memberships: { profile: {} } } } : null);
  const existingMemberIds = new Set((chatQuery.data?.chats[0]?.memberships ?? []).map((m) => m.profile?.id).filter(Boolean));

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
  const results = (searchQuery.data?.profiles ?? []).filter((profile) => !existingMemberIds.has(profile.id));

  function toggleSelected(profile: Profile) {
    setSelected((current) =>
      current.some((p) => p.id === profile.id) ? current.filter((p) => p.id !== profile.id) : [...current, profile],
    );
  }

  const canAdd = Boolean(chatId) && selected.length > 0 && !isAdding;

  async function handleAdd() {
    if (!chatId || !canAdd) return;
    setIsAdding(true);
    try {
      const now = new Date().toISOString();
      await db.transact(
        selected.map((profile) =>
          db.tx.memberships[id()]
            .update({ role: "member", joinedAt: now, lastReadAt: now, muted: false })
            .link({ chat: chatId, profile: profile.id }),
        ),
      );
      router.back();
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <ScreenContainer className="px-4 pt-4">
      <Stack.Screen
        options={{
          headerShown: true,
          presentation: "modal",
          headerTitle: t("addGroupMember.title"),
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
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

      <Button label={t("groupDetails.addMember")} onPress={handleAdd} disabled={!canAdd} loading={isAdding} />
    </ScreenContainer>
  );
}
