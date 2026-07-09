import { Stack } from "expo-router";
import { Newspaper } from "lucide-react-native";
import { EmptyState, ScreenContainer } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

export default function NewsScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();

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
      <EmptyState
        icon={<Newspaper color={colors.textMuted} size={40} />}
        title={t("news.empty.title")}
        description={t("news.empty.description")}
      />
    </ScreenContainer>
  );
}
