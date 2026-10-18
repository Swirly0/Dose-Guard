import { router } from 'expo-router';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useSettings } from '@/state/SettingsContext';
import { colors } from '@/theme';

/** Shown on Home and Verify when the laptop URL has not been saved yet. */
export function BackendMissingCard() {
  const { settings } = useSettings();
  if (settings.backendUrl) return null;

  return (
    <Card>
      <AppText variant="subheading">Backend not configured</AppText>
      <AppText color={colors.textMuted}>
        Set the laptop URL from Settings so the app can run camera and scale checks.
      </AppText>
      <Button label="Open Settings" variant="secondary" onPress={() => router.push('/settings')} />
    </Card>
  );
}
