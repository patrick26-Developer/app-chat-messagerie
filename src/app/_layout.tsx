import { useEffect, useRef, type ReactNode } from "react";
import { ActivityIndicator } from "react-native";
import { Redirect, Stack, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ScreenContainer } from "@/components/ui";
import { db } from "@/lib/db";
import { createDefaultProfile, useOwnProfile } from "@/lib/profile";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider, useTheme } from "@/lib/theme";
import "../../global.css";

function AppStatusBar() {
  const { isDark } = useTheme();
  // expo-status-bar n'expose pas de prop `backgroundColor` dans cette
  // version (Android dessine désormais en edge-to-edge par défaut, la
  // barre de statut est transparente) — seul `style` (couleur du texte/
  // icônes) est disponible, ajusté ici selon le thème clair/sombre actif.
  return <StatusBar style={isDark ? "light" : "dark"} />;
}

function AuthGate({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const segments = useSegments();
  const auth = db.useAuth();
  const { profile, isLoading: isProfileLoading } = useOwnProfile();
  const hasAttemptedProfileCreation = useRef(false);

  useEffect(() => {
    if (auth.user && !isProfileLoading && !profile && !hasAttemptedProfileCreation.current) {
      hasAttemptedProfileCreation.current = true;
      // Si ça échoue (ex. le profil existe en fait déjà, cf. contrainte
      // unique sur $user), on ne retente pas indéfiniment dans cette
      // session : la query réactive rattrapera l'état correct dès que
      // possible.
      createDefaultProfile(auth.user).catch(() => {});
    }
  }, [auth.user, isProfileLoading, profile]);

  if (auth.isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator color={colors.accent} />
      </ScreenContainer>
    );
  }

  const inAuthGroup = segments[0] === "(auth)";
  const isSignedIn = Boolean(auth.user) && !auth.error;

  if (!isSignedIn && !inAuthGroup) {
    return <Redirect href="/(auth)/login" />;
  }

  if (isSignedIn && inAuthGroup) {
    return <Redirect href="/(tabs)/discussions" />;
  }

  return children;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <I18nProvider>
          <AppStatusBar />
          <AuthGate>
            {/* headerShown: false ici — sinon ce Stack racine affiche son
                propre header avec le nom brut du segment ("(tabs)",
                "(auth)") par-dessus le header propre à chaque navigateur
                imbriqué. */}
            <Stack screenOptions={{ headerShown: false }} />
          </AuthGate>
        </I18nProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
