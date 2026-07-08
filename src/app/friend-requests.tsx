import { ScrollView, Text, View } from "react-native";
import { Stack } from "expo-router";
import { Avatar, Button, EmptyState, ListItem, ScreenContainer } from "@/components/ui";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { useOwnProfile } from "@/lib/profile";
import { useTheme } from "@/lib/theme";
import type { FriendRequestStatus } from "../../instant.schema";

function SectionTitle({ children }: { children: string }) {
  const { colors } = useTheme();
  return (
    <View className="px-4 pb-1 pt-4">
      <Text className="text-xs font-semibold uppercase" style={{ color: colors.textSecondary }}>
        {children}
      </Text>
    </View>
  );
}

export default function FriendRequestsScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { profile: myProfile } = useOwnProfile();

  const receivedQuery = db.useQuery(
    myProfile
      ? {
          friendRequests: {
            $: { where: { "to.id": myProfile.id, status: "pending" } },
            from: {},
          },
        }
      : null,
  );
  const sentQuery = db.useQuery(
    myProfile
      ? {
          friendRequests: {
            $: { where: { "from.id": myProfile.id, status: "pending" } },
            to: {},
          },
        }
      : null,
  );

  const received = receivedQuery.data?.friendRequests ?? [];
  const sent = sentQuery.data?.friendRequests ?? [];
  const isLoading = receivedQuery.isLoading || sentQuery.isLoading;

  async function handleRespond(requestId: string, status: FriendRequestStatus) {
    await db.transact(db.tx.friendRequests[requestId].update({ status }));
  }

  return (
    <ScreenContainer>
      <Stack.Screen
        options={{
          headerShown: true,
          presentation: "modal",
          headerTitle: t("friendRequests.title"),
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: colors.textSecondary }}>{t("common.loading")}</Text>
        </View>
      ) : received.length === 0 && sent.length === 0 ? (
        <EmptyState title={t("friendRequests.empty")} />
      ) : (
        <ScrollView>
          <SectionTitle>{t("friendRequests.received.title")}</SectionTitle>
          {received.length === 0 ? (
            <Text className="px-4 pb-2 text-sm" style={{ color: colors.textMuted }}>
              {t("friendRequests.received.empty")}
            </Text>
          ) : (
            received.map((request) => (
              <ListItem
                key={request.id}
                leading={<Avatar uri={request.from?.avatarUrl} name={request.from?.displayName} size={44} />}
                title={request.from?.displayName ?? ""}
                subtitle={request.note ?? undefined}
                trailing={
                  <View className="flex-row gap-2">
                    <Button
                      label={t("friendRequests.accept")}
                      variant="primary"
                      onPress={() => handleRespond(request.id, "accepted")}
                    />
                    <Button
                      label={t("friendRequests.decline")}
                      variant="danger"
                      onPress={() => handleRespond(request.id, "declined")}
                    />
                  </View>
                }
              />
            ))
          )}

          <SectionTitle>{t("friendRequests.sent.title")}</SectionTitle>
          {sent.length === 0 ? (
            <Text className="px-4 pb-4 text-sm" style={{ color: colors.textMuted }}>
              {t("friendRequests.sent.empty")}
            </Text>
          ) : (
            sent.map((request) => (
              <ListItem
                key={request.id}
                leading={<Avatar uri={request.to?.avatarUrl} name={request.to?.displayName} size={44} />}
                title={request.to?.displayName ?? ""}
                trailing={
                  <Text className="text-sm" style={{ color: colors.textMuted }}>
                    {t("friendRequests.sent.pending")}
                  </Text>
                }
              />
            ))
          )}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}
