import { Text } from "react-native";
import { Avatar, Button, ListItem, ScreenContainer } from "@/components/ui";
import { db } from "@/lib/db";
import { useOwnProfile } from "@/lib/profile";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { profile } = useOwnProfile();

  return (
    <ScreenContainer className="gap-4 px-4 pt-4">
      {profile ? (
        <ListItem
          leading={<Avatar uri={profile.avatarUrl} name={profile.displayName} size={48} />}
          title={profile.displayName}
          subtitle={`@${profile.username}`}
        />
      ) : (
        <Text style={{ color: colors.textSecondary }}>{t("profile.loadingProfile")}</Text>
      )}
      <Button label={t("profile.signOut")} variant="danger" onPress={() => db.auth.signOut()} />
    </ScreenContainer>
  );
}
