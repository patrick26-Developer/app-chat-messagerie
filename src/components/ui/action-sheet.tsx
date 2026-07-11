import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme";
import { ModalOverlay } from "./modal-overlay";

export type ActionSheetItemVariant = "default" | "destructive" | "cancel";

export type ActionSheetItem = {
  key: string;
  label: string;
  variant?: ActionSheetItemVariant;
  onPress: () => void;
  disabled?: boolean;
};

type ActionSheetProps = {
  visible: boolean;
  onRequestClose: () => void;
  title?: string;
  subtitle?: string;
  items: ActionSheetItem[];
};

export function ActionSheet({ visible, onRequestClose, title, subtitle, items }: ActionSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const hasHeader = Boolean(title || subtitle);
  const mainItems = items.filter((item) => item.variant !== "cancel");
  const cancelItems = items.filter((item) => item.variant === "cancel");
  const announceOnOpen = [title, subtitle].filter(Boolean).join(". ") || undefined;

  function itemColor(variant?: ActionSheetItemVariant) {
    if (variant === "destructive") return colors.danger;
    if (variant === "cancel") return colors.accent;
    return colors.text;
  }

  function renderRow(item: ActionSheetItem, showTopBorder: boolean) {
    return (
      <Pressable
        key={item.key}
        onPress={() => {
          onRequestClose();
          item.onPress();
        }}
        disabled={item.disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: item.disabled }}
        className="px-4 py-3.5"
        style={[showTopBorder && { borderTopWidth: 1, borderTopColor: colors.border }, item.disabled ? { opacity: 0.5 } : null]}
      >
        <Text
          className={`text-center text-base ${item.variant === "cancel" ? "font-semibold" : "font-medium"}`}
          style={{ color: itemColor(item.variant) }}
        >
          {item.label}
        </Text>
      </Pressable>
    );
  }

  return (
    <ModalOverlay visible={visible} onRequestClose={onRequestClose} placement="bottom" announceOnOpen={announceOnOpen}>
      <View style={{ paddingHorizontal: 12, paddingBottom: Math.max(insets.bottom, 12), gap: 8 }}>
        <View className="overflow-hidden rounded-2xl" style={{ backgroundColor: colors.surfaceElevated }}>
          {hasHeader ? (
            <View className="border-b px-4 py-3" style={{ borderBottomColor: colors.border }}>
              {title ? (
                <Text className="text-center text-xs font-semibold" style={{ color: colors.textSecondary }}>
                  {title}
                </Text>
              ) : null}
              {subtitle ? (
                <Text className="mt-0.5 text-center text-xs" style={{ color: colors.textMuted }}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          ) : null}
          {mainItems.map((item, index) => renderRow(item, index > 0 || hasHeader))}
        </View>
        {cancelItems.length > 0 ? (
          <View className="overflow-hidden rounded-2xl" style={{ backgroundColor: colors.surfaceElevated }}>
            {cancelItems.map((item, index) => renderRow(item, index > 0))}
          </View>
        ) : null}
      </View>
    </ModalOverlay>
  );
}
