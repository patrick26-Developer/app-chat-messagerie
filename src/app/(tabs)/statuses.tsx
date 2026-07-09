import { useMemo, useRef } from "react";
import { FlatList, Pressable, Text, View, type ViewToken } from "react-native";
import { useRouter } from "expo-router";
import { CircleDot, Eye, Plus } from "lucide-react-native";
import { id } from "@instantdb/react-native";
import { Button, EmptyState, ScreenContainer } from "@/components/ui";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { useOwnProfile } from "@/lib/profile";
import { useTheme } from "@/lib/theme";
import type { Status } from "../../../instant.schema";

const DEFAULT_STATUS_BACKGROUND = "#25D366";
// Une carte doit être visible à au moins 60% pour compter comme "vue" —
// évite qu'un ScrollView/FlatList monté d'un coup ne marque tout comme vu
// sans que l'utilisateur n'ait rien scrollé (cf. discussion avant
// implémentation : ce n'était pas un problème d'échelle mais de sens).
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 60 };

export default function StatusesScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { profile: myProfile } = useOwnProfile();

  const seenStatusIdsRef = useRef<Set<string>>(new Set());

  const contactsQuery = db.useQuery(
    myProfile ? { contacts: { $: { where: { owner: myProfile.id } }, contact: {} } } : null,
  );
  // Mémoïsé sur contactsQuery.data (stable tant qu'aucune nouvelle donnée
  // n'arrive du serveur) — sinon un nouveau tableau reconstruit à chaque
  // render change le hash de statusesQuery à chaque fois et provoque une
  // resouscription en boucle ("Maximum update depth exceeded").
  const contactProfileIds = useMemo(
    () =>
      (contactsQuery.data?.contacts ?? [])
        .map((row) => row.contact?.id)
        .filter((contactId): contactId is string => Boolean(contactId)),
    [contactsQuery.data],
  );

  const visibleOwnerIds = useMemo(
    () => (myProfile ? [myProfile.id, ...contactProfileIds] : []),
    [myProfile?.id, contactProfileIds],
  );
  const statusesQuery = db.useQuery(
    myProfile
      ? {
          statuses: {
            $: { where: { "owner.id": { $in: visibleOwnerIds }, expiresAt: { $gt: new Date() } } },
            owner: {},
          },
        }
      : null,
  );

  const statuses = useMemo(
    () =>
      [...(statusesQuery.data?.statuses ?? [])].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [statusesQuery.data],
  );
  const isLoading = statusesQuery.isLoading || contactsQuery.isLoading;

  // Une seule requête groupée pour tous mes statusViews (pas une par statut
  // affiché) — le Set résultant sert à déterminer l'état vu/non-vu de
  // chaque carte sans requête supplémentaire.
  const myViewsQuery = db.useQuery(
    myProfile ? { statusViews: { $: { where: { "viewer.id": myProfile.id } }, status: {} } } : null,
  );
  const viewedStatusIds = useMemo(() => {
    const set = new Set<string>();
    for (const view of myViewsQuery.data?.statusViews ?? []) {
      if (view.status?.id) set.add(view.status.id);
    }
    return set;
  }, [myViewsQuery.data]);

  const myStatusIds = useMemo(
    () => statuses.filter((status) => status.owner?.id === myProfile?.id).map((status) => status.id),
    [statuses, myProfile?.id],
  );
  const viewCountsQuery = db.useQuery(
    myStatusIds.length > 0 ? { statusViews: { $: { where: { "status.id": { $in: myStatusIds } } }, status: {} } } : null,
  );
  const viewCountsByStatusId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const view of viewCountsQuery.data?.statusViews ?? []) {
      const statusId = view.status?.id;
      if (!statusId) continue;
      counts.set(statusId, (counts.get(statusId) ?? 0) + 1);
    }
    return counts;
  }, [viewCountsQuery.data]);

  async function recordView(statusId: string) {
    if (!myProfile || seenStatusIdsRef.current.has(statusId)) return;
    seenStatusIdsRef.current.add(statusId);

    const existing = await db.queryOnce({
      statusViews: { $: { where: { "status.id": statusId, "viewer.id": myProfile.id } } },
    });
    if (existing.data.statusViews.length > 0) return;

    await db.transact(
      db.tx.statusViews[id()]
        .update({ viewedAt: new Date().toISOString() })
        .link({ status: statusId, viewer: myProfile.id }),
    );
  }

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    for (const token of viewableItems) {
      const status = token.item as Status & { owner?: { id: string } };
      if (status.owner?.id && status.owner.id !== myProfile?.id) {
        recordView(status.id);
      }
    }
  }).current;

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
        <FlatList
          data={statuses}
          keyExtractor={(status) => status.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 96 }}
          viewabilityConfig={VIEWABILITY_CONFIG}
          onViewableItemsChanged={onViewableItemsChanged}
          renderItem={({ item: status }) => {
            const isMine = status.owner?.id === myProfile?.id;
            const viewCount = viewCountsByStatusId.get(status.id) ?? 0;
            const isUnseen = !isMine && !viewedStatusIds.has(status.id);

            return (
              <Pressable
                disabled={!isMine}
                onPress={() => isMine && router.push({ pathname: "/status-viewers", params: { statusId: status.id } })}
                className="rounded-xl p-4"
                style={{
                  backgroundColor: status.backgroundColor ?? DEFAULT_STATUS_BACKGROUND,
                  borderWidth: isMine ? 0 : 3,
                  borderColor: isMine ? "transparent" : isUnseen ? colors.accent : colors.border,
                }}
              >
                <Text className="mb-1 text-xs font-semibold" style={{ color: "#FFFFFF" }}>
                  {isMine ? t("statuses.you") : (status.owner?.displayName ?? "")}
                </Text>
                <Text className="text-base" style={{ color: "#FFFFFF" }}>
                  {status.content}
                </Text>
                {isMine ? (
                  <View className="mt-2 flex-row items-center gap-1">
                    <Eye color="#FFFFFF" size={14} />
                    <Text className="text-xs" style={{ color: "#FFFFFF" }}>
                      {t("statuses.viewers.count", { count: String(viewCount) })}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          }}
        />
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
