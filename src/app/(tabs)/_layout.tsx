import { Pressable, Text, View } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { CircleDot, MessageCircle, Moon, Plus, Sun, User, Users } from "lucide-react-native";
import { DiscussionsHeaderMenu } from "@/components/discussions-header-menu";
import { useI18n } from "@/lib/i18n";
import { useHasUnseenContactStatuses } from "@/lib/statuses";
import { useTheme } from "@/lib/theme";

export default function TabsLayout() {
  const { colors, isDark, setColorSchemePreference } = useTheme();
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const hasUnseenStatuses = useHasUnseenContactStatuses();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: { backgroundColor: colors.tabBarBackground, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="discussions"
        options={{
          tabBarLabel: t("tabs.discussions"),
          // Config statique ici (pas via navigation.setOptions() depuis
          // discussions.tsx) : appeler setOptions() dans un useLayoutEffect
          // depuis un écran d'onglet a provoqué une boucle de re-render
          // infinie ("Maximum update depth exceeded") avec le navigateur
          // Tabs. La recherche/les chips vivent dans le corps de l'écran,
          // pas dans le header, donc rien ici ne dépend de l'état local de
          // discussions.tsx — une config statique suffit.
          headerTitle: (props) => (
            <Text
              style={{ color: colors.accent, fontSize: 20, fontWeight: "800" }}
              allowFontScaling={props.allowFontScaling}
            >
              {t("app.name")}
            </Text>
          ),
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
          headerRight: () => (
            <View className="mr-2 flex-row items-center gap-4">
              <Pressable onPress={() => setColorSchemePreference(isDark ? "light" : "dark")} hitSlop={8}>
                {isDark ? <Sun color={colors.text} size={20} /> : <Moon color={colors.text} size={20} />}
              </Pressable>
              <Pressable onPress={() => setLocale(locale === "fr" ? "en" : "fr")} hitSlop={8}>
                <Text style={{ color: colors.text, fontWeight: "700", fontSize: 13 }}>{locale.toUpperCase()}</Text>
              </Pressable>
              <DiscussionsHeaderMenu />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="statuses"
        options={{
          title: t("tabs.statuses"),
          tabBarLabel: t("tabs.statuses"),
          tabBarIcon: ({ color, size }) => (
            <View>
              <CircleDot color={color} size={size} />
              {hasUnseenStatuses ? (
                <View
                  className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: colors.accent }}
                />
              ) : null}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="communities"
        options={{
          title: t("tabs.communities"),
          tabBarLabel: t("tabs.communities"),
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
          headerRight: () => (
            <Pressable onPress={() => router.push("/new-community")} className="mr-4" hitSlop={8}>
              <Plus color={colors.text} size={22} />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarLabel: t("tabs.profile"),
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
