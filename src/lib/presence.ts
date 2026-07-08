import { db } from "./db";
import { useOwnProfile } from "./profile";

const PRESENCE_ROOM_TYPE = "presence";
const PRESENCE_ROOM_ID = "presence";

function usePresenceRoom() {
  return db.room(PRESENCE_ROOM_TYPE, PRESENCE_ROOM_ID);
}

/** À appeler une seule fois, à la racine de l'app (dans _layout.tsx). */
export function usePublishOwnPresence(): void {
  const { profile } = useOwnProfile();
  const room = usePresenceRoom();
  db.rooms.useSyncPresence(room, profile ? { profileId: profile.id, online: true } : {}, [profile?.id]);
}

export function useOnlineProfileIds(): Set<string> {
  const room = usePresenceRoom();
  const { peers } = db.rooms.usePresence(room, { keys: ["profileId"] });
  return new Set(Object.values(peers).map((peer) => peer.profileId));
}
