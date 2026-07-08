import { Text, View } from "react-native";
import { Image } from "expo-image";
import { useResolvedAvatarUri } from "@/lib/storage";
import { useTheme } from "@/lib/theme";

type AvatarProps = {
  uri?: string | null;
  name?: string;
  size?: number;
  /** Affiche une pastille verte en bas à droite quand true. */
  online?: boolean;
};

function getInitials(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function Avatar({ uri, name, size = 40, online }: AvatarProps) {
  const { colors } = useTheme();
  const resolvedUri = useResolvedAvatarUri(uri);
  const dimensionStyle = { width: size, height: size, borderRadius: size / 2 };
  const dotSize = Math.max(10, Math.round(size * 0.28));

  return (
    <View style={{ width: size, height: size }}>
      {resolvedUri ? (
        <Image source={{ uri: resolvedUri }} style={dimensionStyle} contentFit="cover" />
      ) : (
        <View className="items-center justify-center" style={{ ...dimensionStyle, backgroundColor: colors.accent }}>
          <Text style={{ color: colors.onAccent, fontSize: size * 0.4, fontWeight: "600" }}>{getInitials(name)}</Text>
        </View>
      )}
      {online ? (
        <View
          style={{
            position: "absolute",
            right: -1,
            bottom: -1,
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: colors.online,
            borderWidth: 2,
            borderColor: colors.surface,
          }}
        />
      ) : null}
    </View>
  );
}
