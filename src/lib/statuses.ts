import { db } from "./db";
import { useOwnProfile } from "./profile";

/**
 * Une seule requête groupée pour tous mes statusViews (pas une par statut
 * affiché) — évite le N+1 pour dériver l'ensemble des statuts déjà vus.
 */
export function useHasUnseenContactStatuses(): boolean {
  const { profile } = useOwnProfile();

  const contactsQuery = db.useQuery(
    profile ? { contacts: { $: { where: { owner: profile.id } }, contact: {} } } : null,
  );
  const contactProfileIds = (contactsQuery.data?.contacts ?? [])
    .map((row) => row.contact?.id)
    .filter((id): id is string => Boolean(id));

  const statusesQuery = db.useQuery(
    profile && contactProfileIds.length > 0
      ? { statuses: { $: { where: { "owner.id": { $in: contactProfileIds } } } } }
      : null,
  );
  const contactStatusIds = (statusesQuery.data?.statuses ?? []).map((status) => status.id);

  const viewsQuery = db.useQuery(
    profile ? { statusViews: { $: { where: { "viewer.id": profile.id } }, status: {} } } : null,
  );
  const viewedStatusIds = new Set(
    (viewsQuery.data?.statusViews ?? []).map((view) => view.status?.id).filter((id): id is string => Boolean(id)),
  );

  return contactStatusIds.some((statusId) => !viewedStatusIds.has(statusId));
}
