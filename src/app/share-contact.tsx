import { useState } from "react";
import { ScrollView } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { id } from "@instantdb/react-native";
import { Avatar, EmptyState, ListItem, ScreenContainer } from "@/components/ui";
import { resolveOrCreateDirectChatId } from "@/lib/chats";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { useOnlineProfileIds } from "@/lib/presence";
import { useOwnProfile } from "@/lib/profile";
import { useTheme } from "@/lib/theme";
import type { Profile } from "../../instant.schema";

export default function ShareContactScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { profileId } = useLocalSearchParams<{ profileId: string }>();
  const { profile: myProfile } = useOwnProfile();
  const onlineIds = useOnlineProfileIds();
  const [isSharing, setIsSharing] = useState(false);

  // Profil à PARTAGER (celui dont on envoie la carte) - distinct des
  // contacts listés ci-dessous, qui sont les destinataires possibles.
  const sharedProfileQuery = db.useQuery(profileId ? { profiles: { $: { where: { id: profileId } } } } : null);
  const sharedProfile = sharedProfileQuery.data?.profiles[0];

  const contactsQuery = db.useQuery(myProfile ? { contacts: { $: { where: { owner: myProfile.id } }, contact: {} } } : null);
  const contacts = contactsQuery.data?.contacts ?? [];

  async function shareWith(targetProfile: Profile) {
    if (!myProfile || !sharedProfile || isSharing) return;
    setIsSharing(true);
    try {
      const chatId = await resolveOrCreateDirectChatId(myProfile.id, targetProfile.id);
      const now = new Date().toISOString();
      const previewText = t("chat.contactCard.preview", { name: sharedProfile.displayName });

      await db.transact([
        db.tx.messages[id()]
          .update({
            type: "contactCard",
            text: "",
            createdAt: now,
            contactCardUsername: sharedProfile.username,
            contactCardDisplayName: sharedProfile.displayName,
            contactCardAvatarPath: sharedProfile.avatarUrl,
          })
          .link({ chat: chatId, sender: myProfile.id }),
        db.tx.chats[chatId].update({ lastMessageAt: now, lastMessagePreview: previewText }),
      ]);

      router.replace({ pathname: "/chat/[chatId]", params: { chatId } });
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <ScreenContainer className="px-4 pt-4">
      <Stack.Screen
        options={{
          headerShown: true,
          presentation: "modal",
          headerTitle: t("shareContact.title"),
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />
      {contacts.length === 0 ? (
        <EmptyState title={t("selectContact.noContactsYet")} />
      ) : (
        <ScrollView>
          {contacts.map((row) =>
            row.contact ? (
              <ListItem
                key={row.id}
                leading={
                  <Avatar
                    uri={row.contact.avatarUrl}
                    name={row.contact.displayName}
                    size={44}
                    online={onlineIds.has(row.contact.id)}
                  />
                }
                title={row.contact.displayName}
                subtitle={`@${row.contact.username}`}
                onPress={() => shareWith(row.contact as Profile)}
              />
            ) : null,
          )}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}
