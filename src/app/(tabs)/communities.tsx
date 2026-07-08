import { ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Users } from "lucide-react-native";
import { Avatar, Button, EmptyState, ListItem, ScreenContainer } from "@/components/ui";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { useOwnProfile } from "@/lib/profile";
import { useTheme } from "@/lib/theme";

export default function CommunitiesScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { profile, isLoading: isProfileLoading } = useOwnProfile();

  const membershipsQuery = db.useQuery(
    profile
      ? {
          memberships: {
            $: { where: { "profile.id": profile.id, "chat.isCommunity": true } },
            chat: {},
          },
        }
      : null,
  );

  const communities = membershipsQuery.data?.memberships ?? [];
  const isLoading = isProfileLoading || membershipsQuery.isLoading;

  if (isLoading) return <ScreenContainer>{null}</ScreenContainer>;

  if (communities.length === 0) {
    return (
      <ScreenContainer>
        <EmptyState
          icon={<Users color={colors.textMuted} size={40} />}
          title={t("communities.empty.title")}
          description={t("communities.empty.description")}
          action={<Button label={t("communities.create")} onPress={() => router.push("/new-community")} />}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView>
        {communities.map((membership, index) => {
          const chat = membership.chat;
          if (!chat) return null;
          return (
            <ListItem
              key={membership.id}
              index={index}
              leading={<Avatar uri={chat.avatarUrl} name={chat.name} size={48} />}
              title={chat.name ?? t("discussions.untitledConversation")}
              subtitle={chat.lastMessagePreview}
              onPress={() => router.push({ pathname: "/chat/[chatId]", params: { chatId: chat.id } })}
            />
          );
        })}
      </ScrollView>
    </ScreenContainer>
  );
}
