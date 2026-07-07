import { ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { useTheme } from "@/lib/theme";

export type ButtonVariant = "primary" | "secondary" | "danger";

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
};

export function Button({ label, onPress, variant = "primary", disabled, loading }: ButtonProps) {
  const { colors } = useTheme();
  const isDisabled = Boolean(disabled) || Boolean(loading);

  const backgroundColor =
    variant === "primary" ? colors.accent : variant === "danger" ? colors.danger : colors.surface;
  const textColor = variant === "secondary" ? colors.text : colors.onAccent;
  const borderColor = variant === "secondary" ? colors.border : "transparent";

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      className="items-center rounded-lg border py-3"
      style={{ backgroundColor, borderColor, opacity: isDisabled ? 0.6 : 1 }}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text className="text-base font-semibold" style={{ color: textColor }}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}
