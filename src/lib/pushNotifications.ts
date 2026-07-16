import { useEffect } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { db } from "./db";
import { useOwnProfile } from "./profile";

/**
 * À appeler une seule fois, à la racine de l'app (dans _layout.tsx), une
 * fois authentifié. Ne demande la permission qu'une fois par statut non
 * tranché - un refus n'est jamais re-proposé à chaque lancement, et
 * n'écrit jamais rien dans profiles.pushTokens (pas de crash, juste pas de
 * token stocké, cf. CLAUDE.md).
 */
export function useRegisterPushToken(): void {
  const { profile } = useOwnProfile();

  useEffect(() => {
    // DIAGNOSTIC TEMPORAIRE — logs à retirer une fois la cause de l'échec silencieux trouvée.
    if (!profile || !Device.isDevice) {
      console.log("[useRegisterPushToken] arrêt précoce: profile=", Boolean(profile), "isDevice=", Device.isDevice);
      return;
    }

    (async () => {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      const finalStatus =
        existingStatus === "granted" ? existingStatus : (await Notifications.requestPermissionsAsync()).status;
      if (finalStatus !== "granted") {
        console.log("[useRegisterPushToken] permission non accordée:", finalStatus);
        return;
      }

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
        });
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        console.log("[useRegisterPushToken] projectId introuvable dans Constants.expoConfig");
        return;
      }

      console.log("[useRegisterPushToken] appel getExpoPushTokenAsync avec projectId=", projectId);
      const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
      console.log("[useRegisterPushToken] token obtenu:", token);
      const currentTokens = Array.isArray(profile.pushTokens) ? profile.pushTokens : [];
      if (currentTokens.includes(token)) return;

      await db.transact(db.tx.profiles[profile.id].update({ pushTokens: [...currentTokens, token] }));
      // DIAGNOSTIC TEMPORAIRE — à retirer une fois la cause de l'échec silencieux trouvée.
    })().catch((error) => console.error("[useRegisterPushToken] échec:", error));
  }, [profile]);
}
