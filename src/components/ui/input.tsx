import { Text, TextInput, View, type TextInputProps } from "react-native";
import { useTheme } from "@/lib/theme";

type InputProps = Omit<TextInputProps, "style" | "placeholderTextColor"> & {
  error?: string;
  containerClassName?: string;
};

export function Input({ error, containerClassName, ...textInputProps }: InputProps) {
  const { colors } = useTheme();

  return (
    <View className={containerClassName}>
      <TextInput
        {...textInputProps}
        placeholderTextColor={colors.placeholder}
        className="rounded-lg border px-4 py-3 text-base"
        style={{
          backgroundColor: colors.inputBackground,
          color: colors.text,
          borderColor: error ? colors.danger : colors.border,
        }}
      />
      {error ? (
        <Text className="mt-1 text-sm" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
