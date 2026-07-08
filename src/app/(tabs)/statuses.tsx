import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { CircleDot, Plus } from "lucide-react-native";
import { Button, EmptyState, ScreenContainer } from "@/components/ui";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { useOwnProfile } from "@/lib/profile";
import { useTheme } from "@/lib/theme";

const DEFAULT_STATUS_BACKGROUND = "#25D366";

export default function StatusesScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { profile: myProfile } = useOwnProfile();

  const contactsQuery = db.useQuery(
    myProfile ? { contacts: { $: { where: { owner: myProfile.id } }, contact: {} } } : null,
  );
  const contactProfileIds = (contactsQuery.data?.contacts ?? [])
    .map((row) => row.contact?.id)
    .filter((contactId): contactId is string => Boolean(contactId));

  const visibleOwnerIds = myProfile ? [myProfile.id, ...contactProfileIds] : [];
  const statusesQuery = db.useQuery(
    myProfile
      ? {
          statuses: {
            $: { where: { "owner.id": { $in: visibleOwnerIds } } },
            owner: {},
          },
        }
      : null,
  );

  const statuses = [...(statusesQuery.data?.statuses ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const isLoading = statusesQuery.isLoading || contactsQuery.isLoading;

  return (
    <ScreenContainer>
      {isLoading ? null : statuses.length === 0 ? (
        <EmptyState
          icon={<CircleDot color={colors.textMuted} size={40} />}
          title={t("statuses.empty.title")}
          description={t("statuses.empty.description")}
          action={<Button label={t("statuses.empty.cta")} onPress={() => router.push("/publish-status")} />}
        />
      ) : (
        <ScrollView className="px-4 pt-4" contentContainerStyle={{ gap: 12, paddingBottom: 96 }}>
          {statuses.map((status) => (
            <View
              key={status.id}
              className="rounded-xl p-4"
              style={{ backgroundColor: status.backgroundColor ?? DEFAULT_STATUS_BACKGROUND }}
            >
              <Text className="mb-1 text-xs font-semibold" style={{ color: "#FFFFFF" }}>
                {status.owner?.id === myProfile?.id ? t("statuses.you") : (status.owner?.displayName ?? "")}
              </Text>
              <Text className="text-base" style={{ color: "#FFFFFF" }}>
                {status.content}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      <Pressable
        onPress={() => router.push("/publish-status")}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full"
        style={{ backgroundColor: colors.accent, elevation: 4 }}
      >
        <Plus color={colors.onAccent} size={26} />
      </Pressable>
    </ScreenContainer>
  );
}
