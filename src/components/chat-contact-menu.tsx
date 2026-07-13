import { useState } from "react";
import { Alert, Modal, Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { EllipsisVertical, Eye, Share2, ShieldOff, UserMinus } from "lucide-react-native";
import { id } from "@instantdb/react-native";
import { ConfirmDialog } from "@/components/ui";
import { db } from "@/lib/db";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

type MenuEntry = {
  key: string;
  Icon: typeof Eye;
  labelKey: TranslationKey;
  danger?: boolean;
};

type ChatContactMenuProps = {
  myProfileId: string;
  otherProfileId: string;
  chatId: string;
};

export function ChatContactMenu({ myProfileId, otherProfileId, chatId }: ChatContactMenuProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isBlockConfirmOpen, setIsBlockConfirmOpen] = useState(false);

  // `view: isBlocker` seul (cf. instant.perms.ts) : cette query ne peut
  // JAMAIS remonter une ligne où je suis `blocked` — seule ma propre
  // décision de bloquer m'est visible, jamais celle de l'autre (pas de
  // notification "vous avez été bloqué").
  const blockQuery = db.useQuery({
    blocks: { $: { where: { blocker: myProfileId, blocked: otherProfileId } } },
  });
  const blockRow = blockQuery.data?.blocks[0];
  const isBlockedByMe = Boolean(blockRow);

  const ENTRIES: MenuEntry[] = [
    { key: "viewContact", Icon: Eye, labelKey: "chat.menu.viewContact" },
    { key: "shareContact", Icon: Share2, labelKey: "chat.menu.shareContact" },
    { key: "removeContact", Icon: UserMinus, labelKey: "chat.menu.removeContact", danger: true },
    {
      key: "block",
      Icon: ShieldOff,
      labelKey: isBlockedByMe ? "chat.menu.unblock" : "chat.menu.block",
      danger: !isBlockedByMe,
    },
  ];

  async function handleBlock() {
    await db.transact([
      db.tx.blocks[id()].update({ createdAt: new Date().toISOString() }).link({ blocker: myProfileId, blocked: otherProfileId }),
      db.tx.chats[chatId].update({ messagingBlocked: true }),
    ]);
  }

  async function handleUnblock() {
    if (!blockRow) return;
    await db.transact([db.tx.blocks[blockRow.id].delete(), db.tx.chats[chatId].update({ messagingBlocked: false })]);
  }

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
    if (entry.key === "shareContact") {
      router.push({ pathname: "/share-contact", params: { profileId: otherProfileId } });
      return;
    }
    if (entry.key === "block") {
      if (isBlockedByMe) {
        handleUnblock();
      } else {
        setIsBlockConfirmOpen(true);
      }
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
      <ConfirmDialog
        visible={isBlockConfirmOpen}
        onRequestClose={() => setIsBlockConfirmOpen(false)}
        title={t("chat.block.confirmTitle")}
        message={t("chat.block.confirmMessage")}
        confirmLabel={t("chat.block.confirm")}
        confirmVariant="destructive"
        onConfirm={() => {
          setIsBlockConfirmOpen(false);
          handleBlock();
        }}
      />
    </>
  );
}
