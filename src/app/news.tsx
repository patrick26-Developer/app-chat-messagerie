import { FlatList, Pressable, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Newspaper, Plus } from "lucide-react-native";
import { EmptyState, ScreenContainer } from "@/components/ui";
import { ADMIN_EMAIL } from "@/lib/adminEmail";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

export default function NewsScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const auth = db.useAuth();
  const isAppAdmin = auth.user?.email === ADMIN_EMAIL;

  const announcementsQuery = db.useQuery({ announcements: {} });
  const announcements = [...(announcementsQuery.data?.announcements ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <ScreenContainer>
      <Stack.Screen
        options={{
          headerShown: true,
          presentation: "modal",
          headerTitle: t("discussions.filters.news"),
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />
      {!announcementsQuery.isLoading && announcements.length === 0 ? (
        <EmptyState
          icon={<Newspaper color={colors.textMuted} size={40} />}
          title={t("news.empty.title")}
          description={t("news.empty.description")}
        />
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 96 }}
          renderItem={({ item }) => (
            <View className="rounded-xl p-4" style={{ backgroundColor: colors.surface }}>
              {item.title ? (
                <Text className="mb-1 text-base font-semibold" style={{ color: colors.text }}>
                  {item.title}
                </Text>
              ) : null}
              <Text className="text-sm" style={{ color: colors.text }}>
                {item.body}
              </Text>
              <Text className="mt-2 text-xs" style={{ color: colors.textMuted }}>
                {new Date(item.createdAt).toLocaleDateString(undefined, {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </Text>
            </View>
          )}
        />
      )}
      {isAppAdmin ? (
        <Pressable
          onPress={() => router.push("/publish-announcement")}
          className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: colors.accent, elevation: 4 }}
        >
          <Plus color={colors.onAccent} size={26} />
        </Pressable>
      ) : null}
    </ScreenContainer>
  );
}
