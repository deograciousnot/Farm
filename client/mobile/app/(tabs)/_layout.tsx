import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { HapticTab } from '@/components/navigation/haptic-tab';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(active: IconName, inactive: IconName) {
  return function TabIcon({ color, focused }: { color: string; focused: boolean }) {
    return <Ionicons name={focused ? active : inactive} size={24} color={color} />;
  };
}

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSubtle,
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontFamily: FontFamily.semibold, fontSize: 11 },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabIcon('home', 'home-outline') }} />
      <Tabs.Screen
        name="marketplace"
        options={{ title: 'Market', tabBarIcon: tabIcon('storefront', 'storefront-outline') }}
      />
      <Tabs.Screen
        name="community"
        options={{ title: 'Community', tabBarIcon: tabIcon('people', 'people-outline') }}
      />
      <Tabs.Screen name="orders" options={{ title: 'Orders', tabBarIcon: tabIcon('receipt', 'receipt-outline') }} />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: tabIcon('person-circle', 'person-circle-outline') }}
      />
    </Tabs>
  );
}
