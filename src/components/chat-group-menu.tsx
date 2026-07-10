import { Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Users } from "lucide-react-native";
import { useTheme } from "@/lib/theme";

type ChatGroupMenuProps = {
  chatId: string;
};

export function ChatGroupMenu({ chatId }: ChatGroupMenuProps) {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/group-details", params: { chatId } })}
      className="mr-4"
      hitSlop={8}
    >
      <Users color={colors.text} size={22} />
    </Pressable>
  );
}
