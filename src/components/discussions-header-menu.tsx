import { useState } from "react";
import { Alert, Modal, Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { EllipsisVertical, Settings, UserCheck, UserPlus, Users } from "lucide-react-native";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

type MenuEntry = {
  key: string;
  Icon: typeof Users;
  labelKey: TranslationKey;
  /** Si absent : pas encore d'écran, on affiche une Alert temporaire. */
  route?: "/settings";
};

const ENTRIES: MenuEntry[] = [
  { key: "newGroup", Icon: Users, labelKey: "discussions.menu.newGroup" },
  { key: "newChat", Icon: UserPlus, labelKey: "discussions.menu.newChat" },
  { key: "friendRequests", Icon: UserCheck, labelKey: "discussions.menu.friendRequests" },
  { key: "settings", Icon: Settings, labelKey: "discussions.menu.settings", route: "/settings" },
];

export function DiscussionsHeaderMenu() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  function handleSelect(entry: MenuEntry) {
    setIsOpen(false);
    if (entry.route) {
      router.push(entry.route);
      return;
    }
    // Aucun écran pour celui-ci encore — action temporaire en attendant.
    Alert.alert(t(entry.labelKey), t("common.comingSoon"));
  }

  return (
    <>
      <Pressable onPress={() => setIsOpen(true)} className="mr-4" hitSlop={8}>
        <EllipsisVertical color={colors.text} size={22} />
      </Pressable>
      <Modal visible={isOpen} transparent animationType="none" onRequestClose={() => setIsOpen(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setIsOpen(false)}>
          <MotiView
            from={{ opacity: 0, translateY: -8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 150 }}
            className="absolute right-4 top-14 overflow-hidden rounded-lg"
            style={{ backgroundColor: colors.surface, minWidth: 220 }}
          >
            {ENTRIES.map((entry, index) => (
              <Pressable
                key={entry.key}
                onPress={() => handleSelect(entry)}
                className="flex-row items-center gap-3 px-4 py-3"
                style={index > 0 ? { borderTopWidth: 1, borderTopColor: colors.border } : undefined}
              >
                <entry.Icon color={colors.text} size={18} />
                <Text style={{ color: colors.text }}>{t(entry.labelKey)}</Text>
              </Pressable>
            ))}
          </MotiView>
        </Pressable>
      </Modal>
    </>
  );
}
