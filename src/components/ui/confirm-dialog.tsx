import { Pressable, Text, View } from "react-native";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { ModalOverlay } from "./modal-overlay";

export type ConfirmDialogVariant = "default" | "destructive";

type ConfirmDialogProps = {
  visible: boolean;
  onRequestClose: () => void;
  title: string;
  message?: string;
  confirmLabel: string;
  confirmVariant?: ConfirmDialogVariant;
  cancelLabel?: string;
  onConfirm: () => void;
};

export function ConfirmDialog({
  visible,
  onRequestClose,
  title,
  message,
  confirmLabel,
  confirmVariant = "default",
  cancelLabel,
  onConfirm,
}: ConfirmDialogProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const resolvedCancelLabel = cancelLabel ?? t("common.cancel");
  const announceOnOpen = [title, message].filter(Boolean).join(". ") || undefined;
  const confirmColor = confirmVariant === "destructive" ? colors.danger : colors.accent;

  return (
    <ModalOverlay visible={visible} onRequestClose={onRequestClose} placement="center" announceOnOpen={announceOnOpen}>
      <View className="w-72 overflow-hidden rounded-2xl" style={{ backgroundColor: colors.surfaceElevated }}>
        <View className="px-5 pb-4 pt-5">
          <Text className="text-center text-base font-semibold" style={{ color: colors.text }}>
            {title}
          </Text>
          {message ? (
            <Text className="mt-2 text-center text-sm" style={{ color: colors.textSecondary }}>
              {message}
            </Text>
          ) : null}
        </View>
        <View className="flex-row" style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
          <Pressable
            onPress={onRequestClose}
            accessibilityRole="button"
            className="flex-1 items-center py-3.5"
            style={{ borderRightWidth: 1, borderRightColor: colors.border }}
          >
            <Text className="text-base" style={{ color: colors.text }}>
              {resolvedCancelLabel}
            </Text>
          </Pressable>
          <Pressable onPress={onConfirm} accessibilityRole="button" className="flex-1 items-center py-3.5">
            <Text className="text-base font-semibold" style={{ color: confirmColor }}>
              {confirmLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </ModalOverlay>
  );
}
