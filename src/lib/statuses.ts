import { useMemo } from "react";
import { db } from "./db";
import { useOwnProfile } from "./profile";

/**
 * Une seule requête groupée pour tous mes statusViews (pas une par statut
 * affiché) — évite le N+1 pour dériver l'ensemble des statuts déjà vus.
 *
 * Chaque tableau dérivé (contactProfileIds, contactStatusIds,
 * viewedStatusIds) est mémoïsé sur la référence de `.data` (stable tant que
 * le serveur n'a pas poussé un nouveau résultat, cf. resultCacheRef dans
 * useQuery.js) — sans ça, un nouveau tableau reconstruit à chaque render
 * (potentiellement dans un ordre différent) change le hash de la query
 * suivante (`$in`) à chaque fois, provoquant une resouscription en boucle
 * et un "Maximum update depth exceeded".
 */
export function useHasUnseenContactStatuses(): boolean {
  const { profile } = useOwnProfile();

  const contactsQuery = db.useQuery(
    profile ? { contacts: { $: { where: { owner: profile.id } }, contact: {} } } : null,
  );
  const contactProfileIds = useMemo(
    () =>
      (contactsQuery.data?.contacts ?? [])
        .map((row) => row.contact?.id)
        .filter((id): id is string => Boolean(id)),
    [contactsQuery.data],
  );

  const statusesQuery = db.useQuery(
    profile && contactProfileIds.length > 0
      ? { statuses: { $: { where: { "owner.id": { $in: contactProfileIds } } } } }
      : null,
  );
  const contactStatusIds = useMemo(
    () => (statusesQuery.data?.statuses ?? []).map((status) => status.id),
    [statusesQuery.data],
  );

  const viewsQuery = db.useQuery(
    profile ? { statusViews: { $: { where: { "viewer.id": profile.id } }, status: {} } } : null,
  );
  const viewedStatusIds = useMemo(
    () =>
      new Set(
        (viewsQuery.data?.statusViews ?? []).map((view) => view.status?.id).filter((id): id is string => Boolean(id)),
      ),
    [viewsQuery.data],
  );

  return contactStatusIds.some((statusId) => !viewedStatusIds.has(statusId));
}
