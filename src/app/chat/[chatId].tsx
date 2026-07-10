import { useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Send } from "lucide-react-native";
import { id } from "@instantdb/react-native";
import { Avatar, ScreenContainer } from "@/components/ui";
import { ChatContactMenu } from "@/components/chat-contact-menu";
import { ChatGroupMenu } from "@/components/chat-group-menu";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { useOnlineProfileIds } from "@/lib/presence";
import { useOwnProfile } from "@/lib/profile";
import { useTheme } from "@/lib/theme";
import type { Message } from "../../../instant.schema";

const MIN_MESSAGE_INPUT_HEIGHT = 44;
// ~5 lignes avant que le champ ne scroll en interne plutôt que de continuer à grandir.
const MAX_MESSAGE_INPUT_HEIGHT = 130;

export default function ChatScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { chatId: chatIdParam } = useLocalSearchParams<{ chatId: string }>();
  const chatId = Array.isArray(chatIdParam) ? chatIdParam[0] : chatIdParam;
  const { profile: myProfile } = useOwnProfile();
  const onlineIds = useOnlineProfileIds();

  const [text, setText] = useState("");
  const [inputHeight, setInputHeight] = useState(MIN_MESSAGE_INPUT_HEIGHT);
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

  function renderMessage({ item }: { item: Message & { sender?: { id: string } } }) {
    const isMine = item.sender?.id === myProfile?.id;
    const time = new Date(item.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    const bubbleColor = isMine ? colors.bubbleMine : colors.bubbleOther;
    const textColor = isMine ? colors.bubbleMineText : colors.bubbleOtherText;

    return (
      <View className={`px-4 py-1 ${isMine ? "items-end" : "items-start"}`}>
        <View className="max-w-[80%] rounded-2xl px-4 py-2" style={{ backgroundColor: bubbleColor }}>
          <Text style={{ color: textColor }}>{item.text}</Text>
          <Text className="mt-1 text-right text-[10px]" style={{ color: textColor, opacity: 0.7 }}>
            {time}
          </Text>
        </View>
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
