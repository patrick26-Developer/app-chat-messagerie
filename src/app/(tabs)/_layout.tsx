import { Pressable, View } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { CircleDot, MessageCircle, Plus, User, Users } from "lucide-react-native";
import { useI18n } from "@/lib/i18n";
import { useHasUnseenContactStatuses } from "@/lib/statuses";
import { useTheme } from "@/lib/theme";

export default function TabsLayout() {
  const { colors } = useTheme();
  const { t } = useI18n();
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
          // headerTitle/headerRight gérés dynamiquement depuis
          // discussions.tsx via navigation.setOptions() (recherche +
          // toggles thème/langue dépendent de son état local).
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
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
