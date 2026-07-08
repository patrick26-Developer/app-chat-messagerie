import { db } from "./db";

export function avatarPathForUser(userId: string): string {
  return `${userId}/avatar.jpg`;
}

/**
 * `profiles.avatarUrl` stocke un `path` $files, pas une URL directement —
 * les URLs renvoyées par Instant Storage sont signées et expirent après
 * quelques jours (confirmé empiriquement), donc jamais mises en cache
 * telles quelles. Accepte aussi une URL http(s) brute pour rester
 * tolérant si une valeur externe est un jour stockée différemment.
 */
export function useResolvedAvatarUri(pathOrUrl: string | null | undefined): string | undefined {
  const looksLikeUrl = pathOrUrl?.startsWith("http://") || pathOrUrl?.startsWith("https://");
  const filesQuery = db.useQuery(pathOrUrl && !looksLikeUrl ? { $files: { $: { where: { path: pathOrUrl } } } } : null);

  if (looksLikeUrl) return pathOrUrl ?? undefined;
  return filesQuery.data?.$files[0]?.url;
}
