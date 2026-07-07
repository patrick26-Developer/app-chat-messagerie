import { Text, View } from "react-native";
import { Image } from "expo-image";
import { useTheme } from "@/lib/theme";

type AvatarProps = {
  uri?: string | null;
  name?: string;
  size?: number;
};

function getInitials(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function Avatar({ uri, name, size = 40 }: AvatarProps) {
  const { colors } = useTheme();
  const dimensionStyle = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={dimensionStyle} contentFit="cover" />;
  }

  return (
    <View className="items-center justify-center" style={{ ...dimensionStyle, backgroundColor: colors.accent }}>
      <Text style={{ color: colors.onAccent, fontSize: size * 0.4, fontWeight: "600" }}>{getInitials(name)}</Text>
    </View>
  );
}
