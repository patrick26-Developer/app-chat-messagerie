import { useState } from "react";
import { Alert, Modal, Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { EllipsisVertical, Eye, Share2, ShieldOff, UserMinus } from "lucide-react-native";
import { db } from "@/lib/db";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

type MenuEntry = {
  key: string;
  Icon: typeof Eye;
  labelKey: TranslationKey;
  danger?: boolean;
};

const ENTRIES: MenuEntry[] = [
  { key: "viewContact", Icon: Eye, labelKey: "chat.menu.viewContact" },
  { key: "shareContact", Icon: Share2, labelKey: "chat.menu.shareContact" },
  { key: "removeContact", Icon: UserMinus, labelKey: "chat.menu.removeContact", danger: true },
  { key: "block", Icon: ShieldOff, labelKey: "chat.menu.block", danger: true },
];

type ChatContactMenuProps = {
  myProfileId: string;
  otherProfileId: string;
};

export function ChatContactMenu({ myProfileId, otherProfileId }: ChatContactMenuProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  async function handleRemoveContact() {
    const [contactsRows, requestRows] = await Promise.all([
      db.queryOnce({
        contacts: {
          $: {
            where: {
              or: [
                { owner: myProfileId, contact: otherProfileId },
                { owner: otherProfileId, contact: myProfileId },
              ],
            },
          },
        },
      }),
      db.queryOnce({
        friendRequests: {
          $: {
            where: {
              or: [
                { from: myProfileId, to: otherProfileId },
                { from: otherProfileId, to: myProfileId },
              ],
            },
          },
        },
      }),
    ]);

    await db.transact([
      ...contactsRows.data.contacts.map((row) => db.tx.contacts[row.id].delete()),
      ...requestRows.data.friendRequests.map((row) => db.tx.friendRequests[row.id].delete()),
    ]);
  }

  function handleSelect(entry: MenuEntry) {
    setIsOpen(false);
    if (entry.key === "viewContact") {
      router.push({ pathname: "/contact-details", params: { profileId: otherProfileId } });
      return;
    }
    if (entry.key === "shareContact" || entry.key === "block") {
      Alert.alert(t(entry.labelKey), t("common.comingSoon"));
      return;
    }
    if (entry.key === "removeContact") {
      Alert.alert(t("chat.removeContact.confirmTitle"), t("chat.removeContact.confirmMessage"), [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("chat.removeContact.confirm"), style: "destructive", onPress: handleRemoveContact },
      ]);
    }
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
                <entry.Icon color={entry.danger ? colors.danger : colors.text} size={18} />
                <Text style={{ color: entry.danger ? colors.danger : colors.text }}>{t(entry.labelKey)}</Text>
              </Pressable>
            ))}
          </MotiView>
        </Pressable>
      </Modal>
    </>
  );
}
