import { FlatList, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Avatar } from "@/components/ui";
import { db } from "@/lib/db";
import { resolveOrCreateDirectChatId } from "@/lib/chats";
import { useOnlineProfileIds } from "@/lib/presence";
import { useOwnProfile } from "@/lib/profile";
import { useTheme } from "@/lib/theme";

const AVATAR_SIZE = 56;
const ITEM_WIDTH = 68;

export function OnlineContactsRow() {
  const { colors } = useTheme();
  const router = useRouter();
  const { profile } = useOwnProfile();
  const onlineIds = useOnlineProfileIds();

  const contactsQuery = db.useQuery(profile ? { contacts: { $: { where: { owner: profile.id } }, contact: {} } } : null);

  const onlineContacts = (contactsQuery.data?.contacts ?? [])
    .filter((row) => row.contact && onlineIds.has(row.contact.id))
    .map((row) => row.contact!);

  if (onlineContacts.length === 0) return null;

  async function handlePress(contactId: string) {
    if (!profile) return;
    const chatId = await resolveOrCreateDirectChatId(profile.id, contactId);
    router.push({ pathname: "/chat/[chatId]", params: { chatId } });
  }

  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={onlineContacts}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ gap: 12, paddingVertical: 8 }}
      renderItem={({ item }) => (
        <Pressable onPress={() => handlePress(item.id)} className="items-center" style={{ width: ITEM_WIDTH }}>
          <Avatar uri={item.avatarUrl} name={item.displayName} size={AVATAR_SIZE} online />
          <Text numberOfLines={1} className="mt-1 text-xs" style={{ color: colors.textSecondary }}>
            {item.displayName}
          </Text>
        </Pressable>
      )}
    />
  );
}
