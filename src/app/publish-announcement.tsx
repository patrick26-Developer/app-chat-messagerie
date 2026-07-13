import { useState } from "react";
import { TextInput, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { id } from "@instantdb/react-native";
import { Button, ScreenContainer } from "@/components/ui";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

export default function PublishAnnouncementScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const trimmedBody = body.trim();
  const canPublish = trimmedBody.length > 0 && !isPublishing;

  async function handlePublish() {
    if (!canPublish) return;
    setIsPublishing(true);
    try {
      const trimmedTitle = title.trim();
      await db.transact(
        db.tx.announcements[id()].update({
          ...(trimmedTitle ? { title: trimmedTitle } : {}),
          body: trimmedBody,
          createdAt: new Date().toISOString(),
        }),
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
          headerTitle: t("news.publish.title"),
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder={t("news.publish.titlePlaceholder")}
        placeholderTextColor={colors.placeholder}
        className="mb-3 rounded-lg border px-4 py-3 text-base"
        style={{ backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }}
      />
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder={t("news.publish.bodyPlaceholder")}
        placeholderTextColor={colors.placeholder}
        multiline
        className="mb-4 rounded-lg border px-4 py-3 text-base"
        style={{ backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border, minHeight: 120 }}
      />

      <View>
        <Button label={t("news.publish.submit")} onPress={handlePublish} disabled={!canPublish} loading={isPublishing} />
      </View>
    </ScreenContainer>
  );
}
