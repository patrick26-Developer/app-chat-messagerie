import { Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Avatar, ScreenContainer } from "@/components/ui";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

export default function ContactDetailsScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { profileId } = useLocalSearchParams<{ profileId: string }>();

  const profileQuery = db.useQuery(profileId ? { profiles: { $: { where: { id: profileId } } } } : null);
  const profile = profileQuery.data?.profiles[0];

  return (
    <ScreenContainer className="items-center px-6 pt-8">
      <Stack.Screen
        options={{
          headerShown: true,
          presentation: "modal",
          headerTitle: t("contactDetails.title"),
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />
      {profile ? (
        <View className="items-center gap-4">
          <Avatar uri={profile.avatarUrl} name={profile.displayName} size={112} />
          <View className="items-center gap-1">
            <Text className="text-xl font-semibold" style={{ color: colors.text }}>
              {profile.displayName}
            </Text>
            <Text className="text-sm" style={{ color: colors.textSecondary }}>
              @{profile.username}
            </Text>
          </View>
          {profile.phone ? (
            <Text className="text-base" style={{ color: colors.text }}>
              {profile.phone}
            </Text>
          ) : null}
          {profile.bio ? (
            <Text className="text-center text-sm" style={{ color: colors.textSecondary }}>
              {profile.bio}
            </Text>
          ) : null}
        </View>
      ) : null}
    </ScreenContainer>
  );
}
