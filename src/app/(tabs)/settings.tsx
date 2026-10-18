import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function SettingsScreen() {
  return (
    <PlaceholderScreen
      title="Settings"
      description="Reminder preferences, device status, and app info will appear here.">
      <Button
        label="Design preview (temporary)"
        variant="secondary"
        onPress={() => router.push('/design-preview')}
        fullWidth
      />
    </PlaceholderScreen>
  );
}
