import type { User } from "@instantdb/react-native";
import { id } from "@instantdb/react-native";
import { db } from "./db";
import type { Profile } from "../../instant.schema";
import { DEFAULT_COLOR_SCHEME_PREFERENCE, DEFAULT_PALETTE_NAME } from "./theme";

function sanitizeLocalPart(email: string): string {
  const localPart = email.split("@")[0] ?? "";
  const sanitized = localPart.toLowerCase().replace(/[^a-z0-9_]/g, "");
  return sanitized.length > 0 ? sanitized : "user";
}

export function generateDefaultUsername(email: string, userId: string): string {
  const base = sanitizeLocalPart(email);
  const suffix = userId.replace(/-/g, "").slice(0, 6);
  return `${base}_${suffix}`;
}

export function generateDefaultDisplayName(email: string): string {
  return email.split("@")[0] ?? email;
}

export async function createDefaultProfile(user: User): Promise<void> {
  const now = new Date().toISOString();
  const email = user.email ?? "";

  await db.transact(
    db.tx.profiles[id()]
      .update({
        displayName: generateDefaultDisplayName(email),
        username: generateDefaultUsername(email, user.id),
        lastSeenAt: now,
        createdAt: now,
        paletteName: DEFAULT_PALETTE_NAME,
        colorSchemePreference: DEFAULT_COLOR_SCHEME_PREFERENCE,
      })
      .link({ $user: user.id }),
  );
}

type OwnProfileResult = {
  profile: Profile | undefined;
  isLoading: boolean;
};

export function useOwnProfile(): OwnProfileResult {
  const auth = db.useAuth();
  const userId = auth.user?.id;
  const query = db.useQuery(userId ? { profiles: { $: { where: { "$user.id": userId } } } } : null);

  return {
    profile: query.data?.profiles[0],
    isLoading: auth.isLoading || query.isLoading,
  };
}
