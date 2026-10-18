import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Tabs } from 'expo-router';

import { colors } from '@/theme';

type TabIconName = SymbolViewProps['name'];

const TABS: { name: string; title: string; icon: TabIconName }[] = [
  {
    name: 'index',
    title: 'Home',
    icon: { ios: 'house.fill', android: 'home', web: 'home' },
  },
  {
    name: 'medications',
    title: 'Medications',
    icon: { ios: 'pills.fill', android: 'medication', web: 'medication' },
  },
  {
    name: 'pillbox',
    title: 'Pillbox',
    icon: { ios: 'square.grid.3x3.fill', android: 'grid_view', web: 'grid_view' },
  },
  {
    name: 'history',
    title: 'History',
    icon: { ios: 'clock.arrow.circlepath', android: 'history', web: 'history' },
  },
  {
    name: 'settings',
    title: 'Settings',
    icon: { ios: 'gearshape.fill', android: 'settings', web: 'settings' },
  },
];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSubtle,
        sceneStyle: { backgroundColor: colors.background },
      }}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color }) => <SymbolView name={tab.icon} tintColor={color} size={26} />,
          }}
        />
      ))}
    </Tabs>
  );
}
