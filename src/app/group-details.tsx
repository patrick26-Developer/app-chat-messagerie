import { FlatList, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Avatar, Badge, Button, ScreenContainer } from "@/components/ui";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

export default function GroupDetailsScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const auth = db.useAuth();

  const chatQuery = db.useQuery(
    chatId
      ? {
          chats: {
            $: { where: { id: chatId } },
            memberships: { profile: {} },
          },
        }
      : null,
  );

  const chat = chatQuery.data?.chats[0];
  const members = [...(chat?.memberships ?? [])].sort((a, b) => (a.role === b.role ? 0 : a.role === "admin" ? -1 : 1));
  const isAdmin = Boolean(auth.user && chat?.adminUserIds?.includes(auth.user.id));

  return (
    <ScreenContainer>
      <Stack.Screen
        options={{
          headerShown: true,
          presentation: "modal",
          headerTitle: chat?.isCommunity ? t("groupDetails.communityTitle") : t("groupDetails.groupTitle"),
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />
      {chat ? (
        <>
          <View className="items-center gap-2 px-6 pb-4 pt-6">
            <Avatar uri={chat.avatarUrl} name={chat.name} size={88} />
            <Text className="text-xl font-semibold" style={{ color: colors.text }}>
              {chat.name ?? t("discussions.untitledConversation")}
            </Text>
            {chat.description ? (
              <Text className="text-center text-sm" style={{ color: colors.textSecondary }}>
                {chat.description}
              </Text>
            ) : null}
          </View>

          <View className="flex-row items-center justify-between px-4 pb-1 pt-2">
            <Text className="text-xs font-semibold uppercase" style={{ color: colors.textSecondary }}>
              {t("groupDetails.memberCount", { count: String(members.length) })}
            </Text>
          </View>

          <FlatList
            data={members}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 16 }}
            renderItem={({ item }) => (
              <View className="flex-row items-center gap-3 px-4 py-3">
                <Avatar uri={item.profile?.avatarUrl} name={item.profile?.displayName} size={44} />
                <View className="flex-1">
                  <Text className="text-base font-medium" style={{ color: colors.text }} numberOfLines={1}>
                    {item.profile?.displayName ?? ""}
                  </Text>
                  {item.profile?.username ? (
                    <Text className="text-sm" style={{ color: colors.textSecondary }} numberOfLines={1}>
                      @{item.profile.username}
                    </Text>
                  ) : null}
                </View>
                {item.role === "admin" ? <Badge label={t("groupDetails.roleAdmin")} /> : null}
              </View>
            )}
          />

          {isAdmin ? (
            <View className="px-4 pb-4">
              <Button
                label={t("groupDetails.addMember")}
                onPress={() => router.push({ pathname: "/add-group-member", params: { chatId: chat.id } })}
              />
            </View>
          ) : null}
        </>
      ) : null}
    </ScreenContainer>
  );
}
