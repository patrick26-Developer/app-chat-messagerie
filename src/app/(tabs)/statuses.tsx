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
  // Mémoïsé sur une CLÉ STRING triée-jointe, pas sur contactsQuery.data ni
  // sur le tableau lui-même : si le reactor InstantDB republie un résultat
  // "nouveau" en référence mais identique en contenu (heartbeat, reconnexion),
  // .data change quand même de référence — un useMemo([...data]) seul ne
  // suffit donc pas à casser la cascade. Une clé primitive (comparée par
  // valeur) le fait, quelle que soit l'instabilité en amont. Même chose plus
  // bas pour visibleOwnerIds et myStatusIds : ce sont les tableaux passés
  // directement à un `$in` de db.useQuery, donc les seuls qui comptent pour
  // éviter la resouscription en boucle ("Maximum update depth exceeded").
  const contactProfileIdsRaw = (contactsQuery.data?.contacts ?? [])
    .map((row) => row.contact?.id)
    .filter((contactId): contactId is string => Boolean(contactId));
  const contactProfileIdsKey = [...contactProfileIdsRaw].sort().join(",");
  // eslint-disable-next-line react-hooks/exhaustive-deps -- clé stable volontaire, voir commentaire ci-dessus
  const contactProfileIds = useMemo(() => contactProfileIdsRaw, [contactProfileIdsKey]);

  const visibleOwnerIdsRaw = myProfile ? [myProfile.id, ...contactProfileIds] : [];
  const visibleOwnerIdsKey = visibleOwnerIdsRaw.slice().sort().join(",");
  // eslint-disable-next-line react-hooks/exhaustive-deps -- clé stable volontaire, voir commentaire ci-dessus
  const visibleOwnerIds = useMemo(() => visibleOwnerIdsRaw, [visibleOwnerIdsKey]);
  // `new Date()` calculé une seule fois par montage, PAS inline dans la query
  // : weakHash() convertit un Date via .toJSON() (son ISO string), qui change
  // à chaque milliseconde — un `new Date()` recréé à chaque render change
  // donc le hash de la query à chaque render, ce qui resouscrit en boucle
  // (subscribe() rappelle cb() de façon synchrone à chaque (re)abonnement) et
  // cause le "Maximum update depth exceeded", indépendamment de la stabilité
  // des tableaux passés en $in.
  const notExpiredAfter = useMemo(() => new Date(), []);
  const statusesQuery = db.useQuery(
    myProfile
      ? {
          statuses: {
            $: { where: { "owner.id": { $in: visibleOwnerIds }, expiresAt: { $gt: notExpiredAfter } } },
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

  const myStatusIdsRaw = statuses.filter((status) => status.owner?.id === myProfile?.id).map((status) => status.id);
  const myStatusIdsKey = myStatusIdsRaw.slice().sort().join(",");
  // eslint-disable-next-line react-hooks/exhaustive-deps -- clé stable volontaire, voir commentaire plus haut
  const myStatusIds = useMemo(() => myStatusIdsRaw, [myStatusIdsKey]);
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
