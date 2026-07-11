import { useEffect, useRef, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Send, X } from "lucide-react-native";
import { id } from "@instantdb/react-native";
import { Avatar, ScreenContainer } from "@/components/ui";
import { ChatContactMenu } from "@/components/chat-contact-menu";
import { ChatGroupMenu } from "@/components/chat-group-menu";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { useOnlineProfileIds } from "@/lib/presence";
import { useOwnProfile } from "@/lib/profile";
import { useTheme } from "@/lib/theme";

const MIN_MESSAGE_INPUT_HEIGHT = 44;
// ~5 lignes avant que le champ ne scroll en interne plutôt que de continuer à grandir.
const MAX_MESSAGE_INPUT_HEIGHT = 130;
const GROUP_MESSAGE_AVATAR_SIZE = 28;

export default function ChatScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { chatId: chatIdParam } = useLocalSearchParams<{ chatId: string }>();
  const chatId = Array.isArray(chatIdParam) ? chatIdParam[0] : chatIdParam;
  const router = useRouter();
  const { profile: myProfile } = useOwnProfile();
  const onlineIds = useOnlineProfileIds();

  const [text, setText] = useState("");
  const [inputHeight, setInputHeight] = useState(MIN_MESSAGE_INPUT_HEIGHT);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const hasMarkedRead = useRef(false);

  const chatQuery = db.useQuery(
    chatId
      ? {
          chats: {
            $: { where: { id: chatId } },
            memberships: { profile: {} },
            messages: { sender: {} },
          },
        }
      : null,
  );

  const chat = chatQuery.data?.chats[0];
  const myMembership = chat?.memberships?.find((member) => member.profile?.id === myProfile?.id);
  const otherMember =
    chat && !chat.isGroup ? chat.memberships?.find((member) => member.profile?.id !== myProfile?.id)?.profile : undefined;

  const headerTitleText = chat?.isGroup
    ? (chat.name ?? t("discussions.untitledConversation"))
    : (otherMember?.displayName ?? t("discussions.untitledConversation"));
  const headerAvatarUri = chat?.isGroup ? chat.avatarUrl : otherMember?.avatarUrl;
  const headerAvatarName = chat?.isGroup ? chat.name : otherMember?.displayName;

  const messages = [...(chat?.messages ?? [])].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  useEffect(() => {
    if (myMembership && !hasMarkedRead.current) {
      hasMarkedRead.current = true;
      db.transact(db.tx.memberships[myMembership.id].update({ lastReadAt: new Date().toISOString() })).catch(() => {});
    }
  }, [myMembership]);

  async function handleSend() {
    const trimmedText = text.trim();
    if (!trimmedText || !myProfile || !chatId) return;

    if (editingMessageId) {
      const messageId = editingMessageId;
      setText("");
      setInputHeight(MIN_MESSAGE_INPUT_HEIGHT);
      setEditingMessageId(null);
      await db.transact(db.tx.messages[messageId].update({ text: trimmedText, editedAt: new Date().toISOString() }));
      return;
    }

    setText("");
    setInputHeight(MIN_MESSAGE_INPUT_HEIGHT);
    const now = new Date().toISOString();
    await db.transact([
      db.tx.messages[id()]
        .update({ text: trimmedText, type: "text", createdAt: now })
        .link({ chat: chatId, sender: myProfile.id }),
      db.tx.chats[chatId].update({ lastMessageAt: now, lastMessagePreview: trimmedText }),
    ]);
  }

  function startEditingMessage(message: { id: string; text: string }) {
    setEditingMessageId(message.id);
    setText(message.text);
  }

  function cancelEditingMessage() {
    setEditingMessageId(null);
    setText("");
    setInputHeight(MIN_MESSAGE_INPUT_HEIGHT);
  }

  async function handleDeleteMessage(messageId: string, messageCreatedAt: string | number) {
    if (!chatId) return;
    if (editingMessageId === messageId) {
      cancelEditingMessage();
    }
    // Comparaison à `chat.lastMessageAt` (pas au premier élément du tableau
    // `messages` trié côté client) : `createdAt` du message et
    // `lastMessageAt` du chat sont écrits avec le même `now` à l'envoi
    // (cf. `handleSend`), donc cette égalité identifie le dernier message
    // sans dépendre de la complétude/tri du tableau local.
    const isLastMessage = messageCreatedAt === chat?.lastMessageAt;
    await db.transact([
      db.tx.messages[messageId].update({ text: "", deletedAt: new Date().toISOString() }),
      ...(isLastMessage ? [db.tx.chats[chatId].update({ lastMessagePreview: t("chat.deletedMessage") })] : []),
    ]);
  }

  function confirmDeleteMessage(messageId: string, messageCreatedAt: string | number) {
    Alert.alert(t("chat.deleteMessage.confirmTitle"), t("chat.deleteMessage.confirmMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("chat.deleteMessage.confirm"),
        style: "destructive",
        onPress: () => handleDeleteMessage(messageId, messageCreatedAt),
      },
    ]);
  }

  function handleLongPressMessage(message: { id: string; text: string; createdAt: string | number }) {
    Alert.alert("", undefined, [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("chat.menu.edit"), onPress: () => startEditingMessage(message) },
      { text: t("chat.menu.delete"), style: "destructive", onPress: () => confirmDeleteMessage(message.id, message.createdAt) },
    ]);
  }

  function goToSenderProfile(senderId: string | undefined) {
    if (senderId) router.push({ pathname: "/contact-details", params: { profileId: senderId } });
  }

  function renderMessage({ item, index }: { item: (typeof messages)[number]; index: number }) {
    const isMine = item.sender?.id === myProfile?.id;
    const isDeleted = Boolean(item.deletedAt);
    const canModify = isMine && !isDeleted && item.type !== "system";
    const time = new Date(item.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    const bubbleColor = isMine ? colors.bubbleMine : colors.bubbleOther;
    const textColor = isMine ? colors.bubbleMineText : colors.bubbleOtherText;

    // `messages` est trié du plus récent au plus ancien et la FlatList est
    // `inverted` : le message visuellement AU-DESSUS de item est donc
    // messages[index + 1], pas messages[index - 1]. On affiche
    // avatar/nom sur le premier message de chaque série (en lecture
    // haut-vers-bas), donc quand le voisin du dessus n'existe pas ou a un
    // expéditeur différent — y compris pour mes propres messages.
    const showSenderInfo = Boolean(chat?.isGroup) && messages[index + 1]?.sender?.id !== item.sender?.id;
    // `colors.accent` sur mes propres bulles serait invisible : dans les
    // palettes Instagram/Twitter, `bubbleMine` EST `colors.accent` (même
    // valeur), donc un texte accent sur fond accent. `bubbleMineText`
    // (déjà utilisé pour le corps du message) contraste toujours avec
    // `bubbleMine` par construction, contrairement à `colors.accent`.
    const nameColor = isMine ? textColor : colors.accent;

    const bubbleContent = (
      <View className="max-w-[80%] rounded-2xl px-4 py-2" style={{ backgroundColor: bubbleColor }}>
        {showSenderInfo ? (
          <Pressable onPress={() => goToSenderProfile(item.sender?.id)} hitSlop={4}>
            <Text className="mb-1 text-xs font-semibold" style={{ color: nameColor }}>
              {item.sender?.displayName ?? ""}
            </Text>
          </Pressable>
        ) : null}
        <Text selectable={!isDeleted} style={{ color: textColor, fontStyle: isDeleted ? "italic" : "normal", opacity: isDeleted ? 0.7 : 1 }}>
          {isDeleted ? t("chat.deletedMessage") : item.text}
        </Text>
        <View className="mt-1 flex-row items-center justify-end gap-1">
          {item.editedAt && !isDeleted ? (
            // `textColor` (pas `colors.textMuted`) + opacité réduite : même
            // technique que l'heure juste à côté, pour garantir le contraste
            // avec le fond de LA bulle plutôt qu'une couleur pensée pour
            // le fond de l'écran (cf. le piège déjà rencontré avec
            // `colors.accent` sur `bubbleMine`).
            <Text className="text-[10px]" style={{ color: textColor, opacity: 0.6 }}>
              {t("chat.edited")}
            </Text>
          ) : null}
          <Text className="text-[10px]" style={{ color: textColor, opacity: 0.7 }}>
            {time}
          </Text>
        </View>
      </View>
    );

    const bubble = canModify ? (
      <Pressable onLongPress={() => handleLongPressMessage(item)}>{bubbleContent}</Pressable>
    ) : (
      bubbleContent
    );

    if (!chat?.isGroup) {
      return <View className={`px-4 py-1 ${isMine ? "items-end" : "items-start"}`}>{bubble}</View>;
    }

    const avatarOrSpacer = showSenderInfo ? (
      <Pressable onPress={() => goToSenderProfile(item.sender?.id)} hitSlop={4}>
        <Avatar uri={item.sender?.avatarUrl} name={item.sender?.displayName} size={GROUP_MESSAGE_AVATAR_SIZE} />
      </Pressable>
    ) : (
      // Espace réservé invisible : garde le bord de la bulle (gauche pour
      // les autres, droite pour moi) des bulles suivantes de la même série
      // aligné avec celle qui porte l'avatar, au lieu de les décaler.
      <View style={{ width: GROUP_MESSAGE_AVATAR_SIZE }} />
    );

    return (
      <View className={`flex-row items-end gap-2 px-4 py-1 ${isMine ? "justify-end" : "justify-start"}`}>
        {isMine ? bubble : avatarOrSpacer}
        {isMine ? avatarOrSpacer : bubble}
      </View>
    );
  }

  return (
    <ScreenContainer>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitle: () => (
            <View className="flex-row items-center gap-2">
              <Avatar uri={headerAvatarUri} name={headerAvatarName} size={32} />
              <View>
                <Text style={{ color: colors.text, fontWeight: "600", fontSize: 16 }}>{headerTitleText}</Text>
                {!chat?.isGroup && otherMember ? (
                  <Text style={{ color: onlineIds.has(otherMember.id) ? colors.accent : colors.textMuted, fontSize: 12 }}>
                    {onlineIds.has(otherMember.id) ? t("chat.online") : t("chat.offline")}
                  </Text>
                ) : null}
              </View>
            </View>
          ),
          headerRight: chat?.isGroup
            ? () => <ChatGroupMenu chatId={chat.id} />
            : otherMember && myProfile
              ? () => <ChatContactMenu myProfileId={myProfile.id} otherProfileId={otherMember.id} />
              : undefined,
        }}
      />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        {chatQuery.isLoading ? (
          <View className="flex-1 items-center justify-center">
            <Text style={{ color: colors.textSecondary }}>{t("chat.loadingMessages")}</Text>
          </View>
        ) : (
          <FlatList
            inverted
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={{ paddingVertical: 8 }}
          />
        )}
        {editingMessageId ? (
          <View
            className="flex-row items-center justify-between border-t px-3 py-1"
            style={{ borderTopColor: colors.border, backgroundColor: colors.surface }}
          >
            <Text className="text-xs" style={{ color: colors.textSecondary }}>
              {t("chat.editingMessage")}
            </Text>
            <Pressable onPress={cancelEditingMessage} hitSlop={8}>
              <X color={colors.textMuted} size={16} />
            </Pressable>
          </View>
        ) : null}
        <View
          className="flex-row items-center gap-2 border-t px-3 py-2"
          style={{ borderTopColor: colors.border, backgroundColor: colors.surface }}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t("chat.messagePlaceholder")}
            placeholderTextColor={colors.placeholder}
            multiline
            blurOnSubmit={false}
            onContentSizeChange={(event) => {
              const nextHeight = event.nativeEvent.contentSize.height;
              setInputHeight(Math.min(Math.max(nextHeight, MIN_MESSAGE_INPUT_HEIGHT), MAX_MESSAGE_INPUT_HEIGHT));
            }}
            className="flex-1 rounded-lg border px-4 py-3 text-base"
            style={{
              backgroundColor: colors.inputBackground,
              color: colors.text,
              borderColor: colors.border,
              height: inputHeight,
              maxHeight: MAX_MESSAGE_INPUT_HEIGHT,
            }}
          />
          <Pressable onPress={handleSend} hitSlop={8}>
            <Send color={colors.accent} size={22} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
