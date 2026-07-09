import { FlatList } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Avatar, EmptyState, ListItem, ScreenContainer } from "@/components/ui";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

export default function StatusViewersScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { statusId } = useLocalSearchParams<{ statusId: string }>();

  const viewsQuery = db.useQuery(
    statusId ? { statusViews: { $: { where: { "status.id": statusId } }, viewer: {} } } : null,
  );

  const views = [...(viewsQuery.data?.statusViews ?? [])].sort(
    (a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime(),
  );

  return (
    <ScreenContainer>
      <Stack.Screen
        options={{
          headerShown: true,
          presentation: "modal",
          headerTitle: t("statuses.viewers.title"),
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />
      {views.length === 0 ? (
        <EmptyState title={t("statuses.viewers.empty")} />
      ) : (
        <FlatList
          data={views}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <ListItem
              index={index}
              leading={<Avatar uri={item.viewer?.avatarUrl} name={item.viewer?.displayName} size={44} />}
              title={item.viewer?.displayName ?? ""}
              subtitle={new Date(item.viewedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
            />
          )}
        />
      )}
    </ScreenContainer>
  );
}
