import { Users } from "lucide-react-native";
import { EmptyState, ScreenContainer } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

export default function CommunitiesScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();

  return (
    <ScreenContainer>
      <EmptyState
        icon={<Users color={colors.textMuted} size={40} />}
        title={t("communities.empty.title")}
        description={t("communities.empty.description")}
      />
    </ScreenContainer>
  );
}
