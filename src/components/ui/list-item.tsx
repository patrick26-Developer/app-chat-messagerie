import type { ReactNode } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { MotiView } from "moti";
import { useTheme } from "@/lib/theme";

type ListItemProps = {
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  /** Position dans une liste, sert uniquement à décaler l'animation d'entrée. */
  index?: number;
};

export function ListItem({ leading, title, subtitle, trailing, onPress, index = 0 }: ListItemProps) {
  const { colors } = useTheme();

  const content = (
    <View className="flex-row items-center gap-3 px-4 py-3">
      {leading}
      <View className="flex-1">
        <Text className="text-base font-medium" style={{ color: colors.text }} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-sm" style={{ color: colors.textSecondary }} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );

  return (
    <MotiView
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 220, delay: index * 40 }}
    >
      {onPress ? <TouchableOpacity onPress={onPress}>{content}</TouchableOpacity> : content}
    </MotiView>
  );
}
