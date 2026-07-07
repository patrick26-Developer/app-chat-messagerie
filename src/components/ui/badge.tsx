import { Text, View } from "react-native";
import { useTheme } from "@/lib/theme";

export type BadgeVariant = "accent" | "danger";

type BadgeProps = {
  label: string | number;
  variant?: BadgeVariant;
};

export function Badge({ label, variant = "accent" }: BadgeProps) {
  const { colors } = useTheme();
  const backgroundColor = variant === "danger" ? colors.danger : colors.badge;
  const textColor = variant === "danger" ? colors.onAccent : colors.badgeText;

  return (
    <View className="items-center justify-center rounded-full px-2 py-0.5" style={{ backgroundColor }}>
      <Text className="text-xs font-semibold" style={{ color: textColor }}>
        {label}
      </Text>
    </View>
  );
}
