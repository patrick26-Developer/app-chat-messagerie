import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { useTheme } from "@/lib/theme";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
};

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View className="flex-1 items-center justify-center gap-2 px-8">
      {icon}
      <Text className="text-lg font-semibold" style={{ color: colors.text }}>
        {title}
      </Text>
      {description ? (
        <Text className="text-center text-sm" style={{ color: colors.textSecondary }}>
          {description}
        </Text>
      ) : null}
      {action ? <View className="mt-4">{action}</View> : null}
    </View>
  );
}
