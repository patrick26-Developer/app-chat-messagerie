import { useState } from "react";
import { Text } from "react-native";
import { useRouter } from "expo-router";
import { InstantAPIError } from "@instantdb/react-native";
import { Button, Input, ScreenContainer } from "@/components/ui";
import { db } from "@/lib/db";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit() {
    const trimmedEmail = email.trim();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setErrorMessage(t("auth.login.invalidEmail"));
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await db.auth.sendMagicCode({ email: trimmedEmail });
      router.push({ pathname: "/(auth)/verify", params: { email: trimmedEmail } });
    } catch (err) {
      if (err instanceof InstantAPIError && err.body?.type === "rate-limited") {
        setErrorMessage(t("auth.login.rateLimited"));
      } else {
        setErrorMessage(t("auth.login.genericError"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScreenContainer className="justify-center gap-4 px-6">
      <Text className="text-2xl font-bold" style={{ color: colors.text }}>
        {t("auth.login.title")}
      </Text>
      <Text className="text-base" style={{ color: colors.textSecondary }}>
        {t("auth.login.subtitle")}
      </Text>
      <Input
        value={email}
        onChangeText={setEmail}
        placeholder={t("auth.login.emailPlaceholder")}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        editable={!isSubmitting}
        error={errorMessage ?? undefined}
      />
      <Button
        label={isSubmitting ? t("auth.login.sending") : t("auth.login.submit")}
        onPress={handleSubmit}
        loading={isSubmitting}
      />
    </ScreenContainer>
  );
}
