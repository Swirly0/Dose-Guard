import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { MedicationsProvider } from '@/state/MedicationsContext';
import { SettingsProvider } from '@/state/SettingsContext';
import { VerificationsProvider } from '@/state/VerificationsContext';
import { colors } from '@/theme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <ThemeProvider value={DefaultTheme}>
      <SettingsProvider>
        <MedicationsProvider>
          <VerificationsProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                contentStyle: { backgroundColor: colors.background },
                headerBackButtonDisplayMode: 'minimal',
              }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="medications/new" options={{ title: 'Add medication' }} />
              <Stack.Screen name="medications/[id]" options={{ title: 'Edit medication' }} />
              <Stack.Screen name="pillbox/[day]" options={{ title: 'Compartment' }} />
              <Stack.Screen name="verify/index" options={{ title: 'Verify a refill' }} />
              <Stack.Screen name="verify/[day]" options={{ title: 'Verify' }} />
              <Stack.Screen name="design-preview" options={{ title: 'Design preview' }} />
            </Stack>
          </VerificationsProvider>
        </MedicationsProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
