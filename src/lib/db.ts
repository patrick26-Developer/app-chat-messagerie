import { init } from "@instantdb/react-native";
import schema, { type AppSchema } from "../../instant.schema";

const appId = process.env.EXPO_PUBLIC_INSTANT_APP_ID;

if (!appId) {
  throw new Error("Missing EXPO_PUBLIC_INSTANT_APP_ID environment variable");
}

export const db = init<AppSchema>({ appId, schema });
