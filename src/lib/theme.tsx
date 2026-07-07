import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";

export type PaletteName = "whatsapp" | "instagram" | "twitter";
export type ColorSchemePreference = "light" | "dark" | "system";
export type ColorScheme = "light" | "dark";

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  onAccent: string;
  bubbleMine: string;
  bubbleMineText: string;
  bubbleOther: string;
  bubbleOtherText: string;
  online: string;
  statusRingUnseen: string;
  statusRingSeen: string;
  badge: string;
  badgeText: string;
  danger: string;
  inputBackground: string;
  placeholder: string;
  tabBarBackground: string;
  tabBarActive: string;
  tabBarInactive: string;
  overlay: string;
};

type Palette = Record<ColorScheme, ThemeColors>;
type Palettes = Record<PaletteName, Palette>;

const whatsappLight = {
  background: "#FFFFFF",
  surface: "#F7F8FA",
  surfaceElevated: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111B21",
  textSecondary: "#54656F",
  textMuted: "#8696A0",
  accent: "#25D366",
  onAccent: "#FFFFFF",
  bubbleMine: "#D9FDD3",
  bubbleMineText: "#111B21",
  bubbleOther: "#FFFFFF",
  bubbleOtherText: "#111B21",
  online: "#22C55E",
  statusRingUnseen: "#25D366",
  statusRingSeen: "#D1D5DB",
  badge: "#25D366",
  badgeText: "#FFFFFF",
  danger: "#EF4444",
  inputBackground: "#F0F2F5",
  placeholder: "#8696A0",
  tabBarBackground: "#FFFFFF",
  tabBarActive: "#25D366",
  tabBarInactive: "#8696A0",
  overlay: "rgba(0, 0, 0, 0.5)",
} satisfies ThemeColors;

const whatsappDark = {
  background: "#0B141A",
  surface: "#111B21",
  surfaceElevated: "#1F2C34",
  border: "#2A3942",
  text: "#E9EDEF",
  textSecondary: "#AEBAC1",
  textMuted: "#8696A0",
  accent: "#25D366",
  onAccent: "#0B141A",
  bubbleMine: "#005C4B",
  bubbleMineText: "#E9EDEF",
  bubbleOther: "#1F2C34",
  bubbleOtherText: "#E9EDEF",
  online: "#34D399",
  statusRingUnseen: "#25D366",
  statusRingSeen: "#3B4A54",
  badge: "#25D366",
  badgeText: "#0B141A",
  danger: "#F87171",
  inputBackground: "#1F2C34",
  placeholder: "#8696A0",
  tabBarBackground: "#111B21",
  tabBarActive: "#25D366",
  tabBarInactive: "#8696A0",
  overlay: "rgba(0, 0, 0, 0.6)",
} satisfies ThemeColors;

const instagramLight = {
  background: "#FFFFFF",
  surface: "#FAFAFA",
  surfaceElevated: "#FFFFFF",
  border: "#DBDBDB",
  text: "#262626",
  textSecondary: "#8E8E8E",
  textMuted: "#C7C7C7",
  accent: "#E1306C",
  onAccent: "#FFFFFF",
  bubbleMine: "#3797EF",
  bubbleMineText: "#FFFFFF",
  bubbleOther: "#EFEFEF",
  bubbleOtherText: "#262626",
  online: "#22C55E",
  statusRingUnseen: "#E1306C",
  statusRingSeen: "#C7C7C7",
  badge: "#ED4956",
  badgeText: "#FFFFFF",
  danger: "#EF4444",
  inputBackground: "#EFEFEF",
  placeholder: "#8E8E8E",
  tabBarBackground: "#FFFFFF",
  tabBarActive: "#E1306C",
  tabBarInactive: "#8E8E8E",
  overlay: "rgba(0, 0, 0, 0.5)",
} satisfies ThemeColors;

const instagramDark = {
  background: "#000000",
  surface: "#121212",
  surfaceElevated: "#1E1E1E",
  border: "#262626",
  text: "#FAFAFA",
  textSecondary: "#A8A8A8",
  textMuted: "#737373",
  accent: "#E1306C",
  onAccent: "#FFFFFF",
  bubbleMine: "#3797EF",
  bubbleMineText: "#FFFFFF",
  bubbleOther: "#262626",
  bubbleOtherText: "#FAFAFA",
  online: "#34D399",
  statusRingUnseen: "#E1306C",
  statusRingSeen: "#404040",
  badge: "#ED4956",
  badgeText: "#FFFFFF",
  danger: "#F87171",
  inputBackground: "#1E1E1E",
  placeholder: "#737373",
  tabBarBackground: "#000000",
  tabBarActive: "#E1306C",
  tabBarInactive: "#A8A8A8",
  overlay: "rgba(0, 0, 0, 0.6)",
} satisfies ThemeColors;

const twitterLight = {
  background: "#FFFFFF",
  surface: "#F7F9F9",
  surfaceElevated: "#FFFFFF",
  border: "#EFF3F4",
  text: "#0F1419",
  textSecondary: "#536471",
  textMuted: "#8B98A5",
  accent: "#1D9BF0",
  onAccent: "#FFFFFF",
  bubbleMine: "#1D9BF0",
  bubbleMineText: "#FFFFFF",
  bubbleOther: "#EFF3F4",
  bubbleOtherText: "#0F1419",
  online: "#22C55E",
  statusRingUnseen: "#1D9BF0",
  statusRingSeen: "#8B98A5",
  badge: "#F4212E",
  badgeText: "#FFFFFF",
  danger: "#EF4444",
  inputBackground: "#EFF3F4",
  placeholder: "#8B98A5",
  tabBarBackground: "#FFFFFF",
  tabBarActive: "#1D9BF0",
  tabBarInactive: "#8B98A5",
  overlay: "rgba(0, 0, 0, 0.5)",
} satisfies ThemeColors;

const twitterDark = {
  background: "#15202B",
  surface: "#192734",
  surfaceElevated: "#22303C",
  border: "#38444D",
  text: "#F7F9F9",
  textSecondary: "#8B98A5",
  textMuted: "#66757F",
  accent: "#1D9BF0",
  onAccent: "#FFFFFF",
  bubbleMine: "#1D9BF0",
  bubbleMineText: "#FFFFFF",
  bubbleOther: "#22303C",
  bubbleOtherText: "#F7F9F9",
  online: "#34D399",
  statusRingUnseen: "#1D9BF0",
  statusRingSeen: "#38444D",
  badge: "#F4212E",
  badgeText: "#FFFFFF",
  danger: "#F87171",
  inputBackground: "#22303C",
  placeholder: "#66757F",
  tabBarBackground: "#15202B",
  tabBarActive: "#1D9BF0",
  tabBarInactive: "#66757F",
  overlay: "rgba(0, 0, 0, 0.6)",
} satisfies ThemeColors;

const palettes: Palettes = {
  whatsapp: { light: whatsappLight, dark: whatsappDark },
  instagram: { light: instagramLight, dark: instagramDark },
  twitter: { light: twitterLight, dark: twitterDark },
};

export const DEFAULT_PALETTE_NAME: PaletteName = "whatsapp";
export const DEFAULT_COLOR_SCHEME_PREFERENCE: ColorSchemePreference = "system";

// Accent scheme-invariant dans nos 6 palettes (même valeur en light/dark) —
// sert de preview de couleur pour un sélecteur de palette (écran Paramètres),
// sans dupliquer les hex à la main ailleurs.
export const PALETTE_ACCENT_PREVIEW: Record<PaletteName, string> = {
  whatsapp: whatsappLight.accent,
  instagram: instagramLight.accent,
  twitter: twitterLight.accent,
};

type ThemeContextValue = {
  paletteName: PaletteName;
  colorScheme: ColorScheme;
  isDark: boolean;
  colors: ThemeColors;
  colorSchemePreference: ColorSchemePreference;
  setPaletteName: (name: PaletteName) => void;
  setColorSchemePreference: (preference: ColorSchemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useSystemColorScheme();
  const [paletteName, setPaletteName] = useState<PaletteName>(DEFAULT_PALETTE_NAME);
  const [colorSchemePreference, setColorSchemePreference] = useState<ColorSchemePreference>(
    DEFAULT_COLOR_SCHEME_PREFERENCE,
  );

  const colorScheme: ColorScheme =
    colorSchemePreference === "system"
      ? systemColorScheme === "dark"
        ? "dark"
        : "light"
      : colorSchemePreference;

  const value = useMemo<ThemeContextValue>(
    () => ({
      paletteName,
      colorScheme,
      isDark: colorScheme === "dark",
      colors: palettes[paletteName][colorScheme],
      colorSchemePreference,
      setPaletteName,
      setColorSchemePreference,
    }),
    [paletteName, colorScheme, colorSchemePreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
