import { useState } from "react";
import { Modal, Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { Plus, UserCheck, UserPlus, Users } from "lucide-react-native";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

type MenuEntry = {
  key: string;
  Icon: typeof Users;
  labelKey: TranslationKey;
  route: "/new-group" | "/select-contact" | "/friend-requests";
};

// Les 3 premières entrées du menu ⋮ (discussions-header-menu.tsx) — "Paramètres"
// en est délibérément exclu, ce bouton est un raccourci vers les actions de
// création/invitation, pas un accès complet au menu.
const ENTRIES: MenuEntry[] = [
  { key: "newGroup", Icon: Users, labelKey: "discussions.menu.newGroup", route: "/new-group" },
  { key: "inviteFriend", Icon: UserPlus, labelKey: "discussions.menu.inviteFriend", route: "/select-contact" },
  { key: "friendRequests", Icon: UserCheck, labelKey: "discussions.menu.friendRequests", route: "/friend-requests" },
];

export function DiscussionsFabMenu() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  function handleSelect(entry: MenuEntry) {
    setIsOpen(false);
    router.push(entry.route);
  }

  return (
    <>
      <Pressable
        onPress={() => setIsOpen(true)}
        className="absolute items-center justify-center rounded-full"
        style={{
          right: 20,
          bottom: 24,
          width: 56,
          height: 56,
          backgroundColor: colors.accent,
          elevation: 4,
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 3 },
        }}
        hitSlop={4}
      >
        <Plus color={colors.onAccent} size={26} />
      </Pressable>

      <Modal visible={isOpen} transparent animationType="none" onRequestClose={() => setIsOpen(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setIsOpen(false)}>
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 150 }}
            className="absolute overflow-hidden rounded-lg"
            style={{ right: 20, bottom: 88, backgroundColor: colors.surface, minWidth: 220 }}
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
