import { ScrollView, Text } from "react-native";
import { MessageCircle } from "lucide-react-native";
import { Avatar, EmptyState, ListItem, ScreenContainer } from "@/components/ui";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { useOwnProfile } from "@/lib/profile";
import { useTheme } from "@/lib/theme";

export default function DiscussionsScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { profile, isLoading: isProfileLoading } = useOwnProfile();

  const membershipsQuery = db.useQuery(
    profile
      ? {
          memberships: {
            $: { where: { "profile.id": profile.id } },
            chat: {
              memberships: { profile: {} },
            },
          },
        }
      : null,
  );

  const conversations = membershipsQuery.data?.memberships ?? [];
  const isLoading = isProfileLoading || membershipsQuery.isLoading;

  if (isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text style={{ color: colors.textSecondary }}>{t("common.loading")}</Text>
      </ScreenContainer>
    );
  }

  if (conversations.length === 0) {
    return (
      <ScreenContainer>
        <EmptyState
          icon={<MessageCircle color={colors.textMuted} size={40} />}
          title={t("discussions.empty.title")}
          description={t("discussions.empty.description")}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView>
        {conversations.map((membership, index) => {
          const chat = membership.chat;
          if (!chat) return null;

          const otherMember = chat.memberships?.find((member) => member.profile?.id !== profile?.id)?.profile;
          const title = chat.isGroup ? (chat.name ?? t("discussions.untitledConversation")) : (otherMember?.displayName ?? t("discussions.untitledConversation"));
          const avatarUri = chat.isGroup ? chat.avatarUrl : otherMember?.avatarUrl;
          const avatarName = chat.isGroup ? chat.name : otherMember?.displayName;
          const time = new Date(chat.lastMessageAt).toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <ListItem
              key={membership.id}
              index={index}
              leading={<Avatar uri={avatarUri} name={avatarName} size={48} />}
              title={title}
              subtitle={chat.lastMessagePreview}
              trailing={
                <Text className="text-xs" style={{ color: colors.textMuted }}>
                  {time}
                </Text>
              }
            />
          );
        })}
      </ScrollView>
    </ScreenContainer>
  );
}
