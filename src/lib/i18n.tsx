import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type Locale = "fr" | "en";

const translations = {
  fr: {
    "app.name": "Causerie",
    "auth.login.title": "Connexion",
    "auth.login.subtitle": "Entre ton adresse email pour recevoir un code de connexion.",
    "auth.login.emailPlaceholder": "Adresse email",
    "auth.login.submit": "Recevoir le code",
    "auth.login.sending": "Envoi en cours…",
    "auth.login.invalidEmail": "Entre une adresse email valide.",
    "auth.login.rateLimited": "Trop de tentatives. Réessaie plus tard.",
    "auth.login.genericError": "Impossible d'envoyer le code. Réessaie.",
    "auth.verify.title": "Vérification",
    "auth.verify.subtitle": "Entre le code envoyé à {{email}}.",
    "auth.verify.codePlaceholder": "Code à 6 chiffres",
    "auth.verify.submit": "Vérifier",
    "auth.verify.resend": "Renvoyer le code",
    "auth.verify.verifying": "Vérification en cours…",
    "auth.verify.invalidCode": "Code invalide ou expiré.",
    "auth.verify.rateLimited": "Trop de tentatives. Réessaie plus tard.",
    "auth.verify.genericError": "Une erreur est survenue. Réessaie.",
    "auth.gate.loading": "Chargement…",
    "common.loading": "Chargement…",
    "common.comingSoon": "Bientôt disponible.",
    "discussions.untitledConversation": "Conversation",
    "discussions.menu.newGroup": "Nouveau groupe",
    "discussions.menu.newChat": "Nouvelle discussion",
    "discussions.menu.friendRequests": "Demandes d'amis",
    "discussions.menu.settings": "Paramètres",
    "settings.title": "Paramètres",
    "settings.section.theme": "Thème",
    "settings.theme.system": "Système",
    "settings.theme.light": "Clair",
    "settings.theme.dark": "Sombre",
    "settings.section.palette": "Palette de couleurs",
    "settings.palette.whatsapp": "WhatsApp",
    "settings.palette.instagram": "Instagram",
    "settings.palette.twitter": "Twitter",
    "settings.section.language": "Langue",
    "settings.language.fr": "Français",
    "settings.language.en": "English",
    "tabs.discussions": "Discussions",
    "tabs.statuses": "Statuts",
    "tabs.communities": "Communautés",
    "tabs.profile": "Profil",
    "discussions.empty.title": "Aucune discussion pour l'instant",
    "discussions.empty.description": "Tes conversations privées et de groupe apparaîtront ici.",
    "statuses.empty.title": "Aucun statut",
    "statuses.empty.description": "Les statuts de tes contacts apparaîtront ici pendant 24h.",
    "communities.empty.title": "Aucune communauté",
    "communities.empty.description": "Les communautés que tu rejoins apparaîtront ici.",
    "profile.loadingProfile": "Chargement du profil…",
    "profile.signOut": "Se déconnecter",
  },
  en: {
    "app.name": "Causerie",
    "auth.login.title": "Sign in",
    "auth.login.subtitle": "Enter your email address to receive a sign-in code.",
    "auth.login.emailPlaceholder": "Email address",
    "auth.login.submit": "Send code",
    "auth.login.sending": "Sending…",
    "auth.login.invalidEmail": "Enter a valid email address.",
    "auth.login.rateLimited": "Too many attempts. Try again later.",
    "auth.login.genericError": "Couldn't send the code. Try again.",
    "auth.verify.title": "Verification",
    "auth.verify.subtitle": "Enter the code sent to {{email}}.",
    "auth.verify.codePlaceholder": "6-digit code",
    "auth.verify.submit": "Verify",
    "auth.verify.resend": "Resend code",
    "auth.verify.verifying": "Verifying…",
    "auth.verify.invalidCode": "Invalid or expired code.",
    "auth.verify.rateLimited": "Too many attempts. Try again later.",
    "auth.verify.genericError": "Something went wrong. Try again.",
    "auth.gate.loading": "Loading…",
    "common.loading": "Loading…",
    "common.comingSoon": "Coming soon.",
    "discussions.untitledConversation": "Conversation",
    "discussions.menu.newGroup": "New group",
    "discussions.menu.newChat": "New chat",
    "discussions.menu.friendRequests": "Friend requests",
    "discussions.menu.settings": "Settings",
    "settings.title": "Settings",
    "settings.section.theme": "Theme",
    "settings.theme.system": "System",
    "settings.theme.light": "Light",
    "settings.theme.dark": "Dark",
    "settings.section.palette": "Color palette",
    "settings.palette.whatsapp": "WhatsApp",
    "settings.palette.instagram": "Instagram",
    "settings.palette.twitter": "Twitter",
    "settings.section.language": "Language",
    "settings.language.fr": "Français",
    "settings.language.en": "English",
    "tabs.discussions": "Chats",
    "tabs.statuses": "Status",
    "tabs.communities": "Communities",
    "tabs.profile": "Profile",
    "discussions.empty.title": "No conversations yet",
    "discussions.empty.description": "Your private and group chats will show up here.",
    "statuses.empty.title": "No status updates",
    "statuses.empty.description": "Your contacts' status updates will show up here for 24h.",
    "communities.empty.title": "No communities",
    "communities.empty.description": "Communities you join will show up here.",
    "profile.loadingProfile": "Loading profile…",
    "profile.signOut": "Sign out",
  },
} as const satisfies Record<Locale, Record<string, string>>;

export type TranslationKey = keyof (typeof translations)["fr"];

const DEFAULT_LOCALE: Locale = "fr";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, params) => {
        const template: string = translations[locale][key];
        if (!params) return template;
        return Object.entries(params).reduce(
          (result, [paramKey, paramValue]) => result.replaceAll(`{{${paramKey}}}`, paramValue),
          template,
        );
      },
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
