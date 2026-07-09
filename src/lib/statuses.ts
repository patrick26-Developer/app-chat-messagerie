import { useMemo } from "react";
import { db } from "./db";
import { useOwnProfile } from "./profile";

/**
 * Une seule requête groupée pour tous mes statusViews (pas une par statut
 * affiché) — évite le N+1 pour dériver l'ensemble des statuts déjà vus.
 *
 * `contactProfileIds` (le tableau passé au `$in` de `statusesQuery`) est
 * mémoïsé sur une CLÉ STRING triée-jointe, pas sur la référence de
 * `contactsQuery.data` : si le reactor InstantDB republie un résultat
 * "nouveau" en référence mais identique en contenu (ex. heartbeat, ping de
 * reconnexion), `.data` change quand même de référence, ce qui aurait
 * recassé la mémoïsation en cascade même avec un `useMemo([...data])`.
 * Une clé primitive (comparée par valeur, pas par référence) casse la
 * chaîne à cet endroit précis, quelle que soit l'instabilité en amont.
 */
export function useHasUnseenContactStatuses(): boolean {
  const { profile } = useOwnProfile();

  const contactsQuery = db.useQuery(
    profile ? { contacts: { $: { where: { owner: profile.id } }, contact: {} } } : null,
  );
  const contactProfileIdsRaw = (contactsQuery.data?.contacts ?? [])
    .map((row) => row.contact?.id)
    .filter((id): id is string => Boolean(id));
  const contactProfileIdsKey = [...contactProfileIdsRaw].sort().join(",");
  // eslint-disable-next-line react-hooks/exhaustive-deps -- clé stable volontaire, voir commentaire ci-dessus
  const contactProfileIds = useMemo(() => contactProfileIdsRaw, [contactProfileIdsKey]);

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
