import { useState } from "react";
import { Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { InstantAPIError } from "@instantdb/react-native";
import { Button, Input, ScreenContainer } from "@/components/ui";
import { db } from "@/lib/db";
import { createDefaultProfile } from "@/lib/profile";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

export default function VerifyScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { email: emailParam } = useLocalSearchParams<{ email: string }>();
  const email = Array.isArray(emailParam) ? (emailParam[0] ?? "") : (emailParam ?? "");

  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit() {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const result = await db.auth.signInWithMagicCode({ email, code });
      if (result.created) {
        // Ne bloque pas la navigation si la création échoue : le point de
        // garde dans _layout.tsx retente la création au prochain rendu si
        // le profil reste introuvable.
        await createDefaultProfile(result.user).catch(() => {});
      }
      router.replace("/");
    } catch (err) {
      setCode("");
      if (err instanceof InstantAPIError && err.body?.type === "rate-limited") {
        setErrorMessage(t("auth.verify.rateLimited"));
      } else if (
        err instanceof InstantAPIError &&
        (err.body?.type === "record-not-found" || err.body?.type === "record-expired")
      ) {
        setErrorMessage(t("auth.verify.invalidCode"));
      } else {
        setErrorMessage(t("auth.verify.genericError"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    setErrorMessage(null);
    setIsResending(true);
    try {
      await db.auth.sendMagicCode({ email });
    } catch {
      setErrorMessage(t("auth.verify.genericError"));
    } finally {
      setIsResending(false);
    }
  }

  return (
    <ScreenContainer className="justify-center gap-4 px-6">
      <Text className="text-2xl font-bold" style={{ color: colors.text }}>
        {t("auth.verify.title")}
      </Text>
      <Text className="text-base" style={{ color: colors.textSecondary }}>
        {t("auth.verify.subtitle", { email })}
      </Text>
      <Input
        value={code}
        onChangeText={setCode}
        placeholder={t("auth.verify.codePlaceholder")}
        keyboardType="number-pad"
        editable={!isSubmitting}
        error={errorMessage ?? undefined}
      />
      <Button
        label={isSubmitting ? t("auth.verify.verifying") : t("auth.verify.submit")}
        onPress={handleSubmit}
        loading={isSubmitting}
      />
      <Button label={t("auth.verify.resend")} onPress={handleResend} variant="secondary" loading={isResending} />
    </ScreenContainer>
  );
}
