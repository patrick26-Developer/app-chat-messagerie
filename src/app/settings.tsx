import { Text, View } from "react-native";
import { Stack } from "expo-router";
import { Check } from "lucide-react-native";
import { ListItem, ScreenContainer } from "@/components/ui";
import { useI18n, type Locale } from "@/lib/i18n";
import {
  PALETTE_ACCENT_PREVIEW,
  useTheme,
  type ColorSchemePreference,
  type PaletteName,
} from "@/lib/theme";

const THEME_MODES: { value: ColorSchemePreference; labelKey: "settings.theme.system" | "settings.theme.light" | "settings.theme.dark" }[] = [
  { value: "system", labelKey: "settings.theme.system" },
  { value: "light", labelKey: "settings.theme.light" },
  { value: "dark", labelKey: "settings.theme.dark" },
];

const PALETTES: { value: PaletteName; labelKey: "settings.palette.whatsapp" | "settings.palette.instagram" | "settings.palette.twitter" }[] = [
  { value: "whatsapp", labelKey: "settings.palette.whatsapp" },
  { value: "instagram", labelKey: "settings.palette.instagram" },
  { value: "twitter", labelKey: "settings.palette.twitter" },
];

const LANGUAGES: { value: Locale; labelKey: "settings.language.fr" | "settings.language.en" }[] = [
  { value: "fr", labelKey: "settings.language.fr" },
  { value: "en", labelKey: "settings.language.en" },
];

function SectionTitle({ children }: { children: string }) {
  const { colors } = useTheme();
  return (
    <View className="px-4 pb-1 pt-4">
      <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold uppercase">
        {children}
      </Text>
    </View>
  );
}

export default function SettingsScreen() {
  const { colors, colorSchemePreference, setColorSchemePreference, paletteName, setPaletteName } = useTheme();
  const { t, locale, setLocale } = useI18n();

  return (
    <ScreenContainer>
      <Stack.Screen
        options={{
          headerShown: true,
          presentation: "modal",
          headerTitle: t("settings.title"),
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />

      <SectionTitle>{t("settings.section.theme")}</SectionTitle>
      {THEME_MODES.map(({ value, labelKey }) => (
        <ListItem
          key={value}
          title={t(labelKey)}
          onPress={() => setColorSchemePreference(value)}
          trailing={colorSchemePreference === value ? <Check color={colors.accent} size={20} /> : undefined}
        />
      ))}

      <SectionTitle>{t("settings.section.palette")}</SectionTitle>
      {PALETTES.map(({ value, labelKey }) => (
        <ListItem
          key={value}
          leading={
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: PALETTE_ACCENT_PREVIEW[value],
              }}
            />
          }
          title={t(labelKey)}
          onPress={() => setPaletteName(value)}
          trailing={paletteName === value ? <Check color={colors.accent} size={20} /> : undefined}
        />
      ))}

      <SectionTitle>{t("settings.section.language")}</SectionTitle>
      {LANGUAGES.map(({ value, labelKey }) => (
        <ListItem
          key={value}
          title={t(labelKey)}
          onPress={() => setLocale(value)}
          trailing={locale === value ? <Check color={colors.accent} size={20} /> : undefined}
        />
      ))}
    </ScreenContainer>
  );
}
