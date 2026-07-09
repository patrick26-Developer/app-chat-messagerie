import { useLayoutEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { MessageCircle, Moon, Search, Sun } from "lucide-react-native";
import { Avatar, EmptyState, ListItem, ScreenContainer } from "@/components/ui";
import { DiscussionsHeaderMenu } from "@/components/discussions-header-menu";
import { db } from "@/lib/db";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { useOnlineProfileIds } from "@/lib/presence";
import { useOwnProfile } from "@/lib/profile";
import { useTheme } from "@/lib/theme";

type ChipKey = "all" | "unread" | "groups" | "communities" | "news";

type Chip = {
  key: ChipKey;
  labelKey: TranslationKey;
};

const CHIPS: Chip[] = [
  { key: "all", labelKey: "discussions.filters.all" },
  { key: "unread", labelKey: "discussions.filters.unread" },
  { key: "groups", labelKey: "discussions.filters.groups" },
  { key: "communities", labelKey: "discussions.filters.communities" },
  { key: "news", labelKey: "discussions.filters.news" },
];

export default function DiscussionsScreen() {
  const { colors, isDark, setColorSchemePreference } = useTheme();
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const navigation = useNavigation();
  const { profile, isLoading: isProfileLoading } = useOwnProfile();
  const onlineIds = useOnlineProfileIds();

  const [query, setQuery] = useState("");
  const [activeChip, setActiveChip] = useState<ChipKey>("all");

  const membershipsQuery = db.useQuery(
    profile
      ? {
          memberships: {
            $: { where: { "profile.id": profile.id } },
            chat: {
              memberships: { profile: {} },
            },
          },
        }
      : null,
  );

  const conversations = membershipsQuery.data?.memberships ?? [];
  const isLoading = isProfileLoading || membershipsQuery.isLoading;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: (props: { allowFontScaling?: boolean }) => (
        <Text style={{ color: colors.accent, fontSize: 20, fontWeight: "800" }} allowFontScaling={props.allowFontScaling}>
          {t("app.name")}
        </Text>
      ),
      headerRight: () => (
        <View className="mr-2 flex-row items-center gap-4">
          <Pressable onPress={() => setColorSchemePreference(isDark ? "light" : "dark")} hitSlop={8}>
            {isDark ? <Sun color={colors.text} size={20} /> : <Moon color={colors.text} size={20} />}
          </Pressable>
          <Pressable onPress={() => setLocale(locale === "fr" ? "en" : "fr")} hitSlop={8}>
            <Text style={{ color: colors.text, fontWeight: "700", fontSize: 13 }}>{locale.toUpperCase()}</Text>
          </Pressable>
          <DiscussionsHeaderMenu />
        </View>
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark, locale, colors]);

  function handleChipPress(chip: Chip) {
    if (chip.key === "news") {
      router.push("/news");
      return;
    }
    setActiveChip(chip.key);
  }

  const trimmedQuery = query.trim().toLowerCase();

  function matchesChip(membership: (typeof conversations)[number]): boolean {
    const chat = membership.chat;
    if (!chat) return false;
    switch (activeChip) {
      case "unread":
        return new Date(chat.lastMessageAt).getTime() > new Date(membership.lastReadAt).getTime();
      case "groups":
        return chat.isGroup && !chat.isCommunity;
      case "communities":
        return Boolean(chat.isCommunity);
      default:
        return true;
    }
  }

  function matchesQuery(membership: (typeof conversations)[number]): boolean {
    if (!trimmedQuery) return true;
    const chat = membership.chat;
    if (!chat) return false;
    const otherMember = chat.memberships?.find((member) => member.profile?.id !== profile?.id)?.profile;
    const name = chat.isGroup ? chat.name : otherMember?.displayName;
    return (name ?? "").toLowerCase().includes(trimmedQuery);
  }

  const filteredConversations = conversations.filter((membership) => matchesChip(membership) && matchesQuery(membership));

  return (
    <ScreenContainer>
      <View className="px-4 pt-3">
        <View
          className="flex-row items-center gap-2 rounded-full px-3"
          style={{ backgroundColor: colors.inputBackground, paddingVertical: 7 }}
        >
          <Search color={colors.placeholder} size={16} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("discussions.searchPlaceholder")}
            placeholderTextColor={colors.placeholder}
            className="flex-1 text-sm"
            style={{ color: colors.text, paddingVertical: 0 }}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 12 }}>
          {CHIPS.map((chip) => {
            const isActive = chip.key !== "news" && activeChip === chip.key;
            return (
              <Pressable
                key={chip.key}
                onPress={() => handleChipPress(chip)}
                className="rounded-full px-4 py-2"
                style={{ backgroundColor: isActive ? colors.accent : colors.surfaceElevated }}
              >
                <Text className="text-sm font-medium" style={{ color: isActive ? colors.onAccent : colors.text }}>
                  {t(chip.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: colors.textSecondary }}>{t("common.loading")}</Text>
        </View>
      ) : conversations.length === 0 ? (
        <EmptyState
          icon={<MessageCircle color={colors.textMuted} size={40} />}
          title={t("discussions.empty.title")}
          description={t("discussions.empty.description")}
        />
      ) : (
        <ScrollView>
          {filteredConversations.map((membership, index) => {
            const chat = membership.chat;
            if (!chat) return null;

            const otherMember = chat.memberships?.find((member) => member.profile?.id !== profile?.id)?.profile;
            const title = chat.isGroup ? (chat.name ?? t("discussions.untitledConversation")) : (otherMember?.displayName ?? t("discussions.untitledConversation"));
            const avatarUri = chat.isGroup ? chat.avatarUrl : otherMember?.avatarUrl;
            const avatarName = chat.isGroup ? chat.name : otherMember?.displayName;
            const time = new Date(chat.lastMessageAt).toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            });

            const isOtherOnline = !chat.isGroup && otherMember ? onlineIds.has(otherMember.id) : false;

            return (
              <ListItem
                key={membership.id}
                index={index}
                leading={<Avatar uri={avatarUri} name={avatarName} size={48} online={isOtherOnline} />}
                title={title}
                subtitle={chat.lastMessagePreview}
                onPress={() => router.push({ pathname: "/chat/[chatId]", params: { chatId: chat.id } })}
                trailing={
                  <Text className="text-xs" style={{ color: colors.textMuted }}>
                    {time}
                  </Text>
                }
              />
            );
          })}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}
