import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import { id } from "@instantdb/react-native";
import { Button, ScreenContainer } from "@/components/ui";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { useOwnProfile } from "@/lib/profile";
import { useTheme } from "@/lib/theme";

const STATUS_BACKGROUND_SWATCHES = ["#25D366", "#1D9BF0", "#E1306C", "#F59E0B", "#8B5CF6", "#111827"];

const STATUS_DURATION_MS = 24 * 60 * 60 * 1000;

export default function PublishStatusScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { profile: myProfile } = useOwnProfile();

  const [content, setContent] = useState("");
  const [backgroundColor, setBackgroundColor] = useState(STATUS_BACKGROUND_SWATCHES[0]);
  const [isPublishing, setIsPublishing] = useState(false);
  const trimmedContent = content.trim();
  const canPublish = trimmedContent.length > 0 && !isPublishing;

  async function handlePublish() {
    if (!myProfile || !canPublish) return;
    setIsPublishing(true);
    try {
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + STATUS_DURATION_MS).toISOString();
      await db.transact(
        db.tx.statuses[id()]
          .update({ content: trimmedContent, backgroundColor, createdAt: now, expiresAt })
          .link({ owner: myProfile.id }),
      );
      router.back();
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <ScreenContainer className="px-4 pt-4">
      <Stack.Screen
        options={{
          headerShown: true,
          presentation: "modal",
          headerTitle: t("statuses.publish.title"),
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />
      <View className="rounded-xl p-4" style={{ backgroundColor }}>
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder={t("statuses.publish.placeholder")}
          placeholderTextColor="#FFFFFFAA"
          multiline
          className="text-base"
          style={{ color: "#FFFFFF", minHeight: 96 }}
        />
      </View>

      <View className="mt-4 flex-row gap-3">
        {STATUS_BACKGROUND_SWATCHES.map((swatch) => (
          <Pressable
            key={swatch}
            onPress={() => setBackgroundColor(swatch)}
            className="h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: swatch }}
          >
            {backgroundColor === swatch ? <Check color="#FFFFFF" size={18} /> : null}
          </Pressable>
        ))}
      </View>

      <Button label={t("statuses.publish.submit")} onPress={handlePublish} disabled={!canPublish} loading={isPublishing} />
    </ScreenContainer>
  );
}
