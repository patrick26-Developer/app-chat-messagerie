import { CircleDot } from "lucide-react-native";
import { EmptyState, ScreenContainer } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

export default function StatusesScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();

  return (
    <ScreenContainer>
      <EmptyState
        icon={<CircleDot color={colors.textMuted} size={40} />}
        title={t("statuses.empty.title")}
        description={t("statuses.empty.description")}
      />
    </ScreenContainer>
  );
}
