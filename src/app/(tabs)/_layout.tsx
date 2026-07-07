import { Text } from "react-native";
import { Tabs } from "expo-router";
import { CircleDot, MessageCircle, User, Users } from "lucide-react-native";
import { DiscussionsHeaderMenu } from "@/components/discussions-header-menu";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

export default function TabsLayout() {
  const { colors } = useTheme();
  const { t } = useI18n();

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
          // Nom de l'app plutôt que le nom de la section, avec un style
          // de titre légèrement personnalisé (l'API headerTitle accepte
          // une fonction, donc pas besoin de sortir du système de header).
          headerTitle: (props) => (
            <Text
              style={{ color: colors.accent, fontSize: 20, fontWeight: "800" }}
              allowFontScaling={props.allowFontScaling}
            >
              {t("app.name")}
            </Text>
          ),
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
          headerRight: () => <DiscussionsHeaderMenu />,
        }}
      />
      <Tabs.Screen
        name="statuses"
        options={{
          title: t("tabs.statuses"),
          tabBarLabel: t("tabs.statuses"),
          tabBarIcon: ({ color, size }) => <CircleDot color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="communities"
        options={{
          title: t("tabs.communities"),
          tabBarLabel: t("tabs.communities"),
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
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
