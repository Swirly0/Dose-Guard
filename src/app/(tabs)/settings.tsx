import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { TextField } from '@/components/TextField';
import { confirmAction } from '@/components/confirm';
import { formatGrams } from '@/constants/modelClasses';
import { WEEKDAYS, type DayOfWeek } from '@/constants/weekdays';
import {
  BackendError,
  fetchStatus,
  setLeds,
  tareScale,
  validateBackendUrl,
  type BackendStatus,
} from '@/services/backend';
import { useSettings } from '@/state/SettingsContext';
import { useVerifications } from '@/state/VerificationsContext';
import { colors, spacing } from '@/theme';

export default function SettingsScreen() {
  const { settings, status: settingsStatus, setBackendUrl } = useSettings();
  const { results, clearResults } = useVerifications();
  const [draftUrl, setDraftUrl] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | undefined>();
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [device, setDevice] = useState<BackendStatus | null>(null);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [tareDay, setTareDay] = useState<DayOfWeek | 'all'>('all');
  const [taring, setTaring] = useState(false);
  const [tareMessage, setTareMessage] = useState<string | null>(null);
  const [ledBusy, setLedBusy] = useState(false);
  const [ledMessage, setLedMessage] = useState<string | null>(null);

  const urlValue = draftUrl ?? settings.backendUrl;

  const saveUrl = () => {
    const error = validateBackendUrl(urlValue);
    setUrlError(error ?? undefined);
    if (error) return;
    setBackendUrl(urlValue);
    setDraftUrl(null);
    setSavedMessage('Backend URL saved.');
    setDevice(null);
    setDeviceError(null);
  };

  const checkDevices = async () => {
    const error = validateBackendUrl(urlValue);
    if (error) {
      setUrlError(error);
      setDeviceError(error);
      return;
    }
    setBackendUrl(urlValue);
    setDraftUrl(null);
    setChecking(true);
    setDeviceError(null);
    try {
      setDevice(await fetchStatus(urlValue));
    } catch (e) {
      setDevice(null);
      setDeviceError(e instanceof BackendError ? e.message : 'Could not reach the backend.');
    } finally {
      setChecking(false);
    }
  };

  const runTare = async () => {
    const empty = await confirmAction({
      title: tareDay === 'all' ? 'Zero every compartment?' : `Zero ${labelFor(tareDay)}?`,
      message: 'Leave the selected bin(s) empty. Anything sitting on a cell will become the new zero.',
      confirmLabel: 'Zero scale',
    });
    if (!empty) return;
    setTaring(true);
    setTareMessage(null);
    try {
      await tareScale(settings.backendUrl, tareDay === 'all' ? undefined : tareDay);
      setTareMessage('Scale zeroed.');
    } catch (e) {
      setTareMessage(e instanceof BackendError ? e.message : 'Tare failed.');
    } finally {
      setTaring(false);
    }
  };

  const testLeds = async () => {
    setLedBusy(true);
    setLedMessage(null);
    try {
      await setLeds(settings.backendUrl, null, 'BLINK', 3000);
      setLedMessage('All LEDs should blink for 3 seconds.');
    } catch (e) {
      setLedMessage(e instanceof BackendError ? e.message : 'Could not set the LEDs.');
    } finally {
      setLedBusy(false);
    }
  };

  const clearHistory = async () => {
    const ok = await confirmAction({
      title: 'Clear verification history?',
      message: 'This removes saved refill checks from this phone. It does not change the schedule.',
      confirmLabel: 'Clear history',
      destructive: true,
    });
    if (ok) clearResults();
  };

  return (
    <Screen>
      {settingsStatus === 'error' && (
        <AppText variant="caption" color={colors.warning}>
          Settings could not be saved on this device.
        </AppText>
      )}

      <SectionHeader title="Laptop backend" />
      <Card>
        <AppText color={colors.textMuted}>
          Start python server.py on the laptop, then paste the printed App backend URL. The phone
          must be on the same Wi-Fi.
        </AppText>
        <TextField
          label="Backend URL"
          value={urlValue}
          onChangeText={(value) => {
            setDraftUrl(value);
            setUrlError(undefined);
            setSavedMessage(null);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="http://192.168.1.10:8000"
          error={urlError}
        />
        <Button label="Save URL" onPress={saveUrl} fullWidth />
        {savedMessage && (
          <AppText variant="caption" color={colors.success}>
            {savedMessage}
          </AppText>
        )}
      </Card>

      <SectionHeader title="Devices" />
      <Card>
        <AppText color={colors.textMuted}>
          Checks that the laptop can see the camera, scale, and model.
        </AppText>
        <Button
          label="Check connection"
          variant="secondary"
          onPress={checkDevices}
          loading={checking}
          disabled={!urlValue}
          fullWidth
        />
        {deviceError && (
          <AppText color={colors.danger}>{deviceError}</AppText>
        )}
        {device && <DeviceStatus status={device} />}
      </Card>

      <SectionHeader title="Scale" />
      <Card>
        <AppText color={colors.textMuted}>
          Zero the load cells with the bins empty and in place.
        </AppText>
        <View style={styles.chips}>
          <Chip label="All" selected={tareDay === 'all'} onPress={() => setTareDay('all')} />
          {WEEKDAYS.map((day) => (
            <Chip
              key={day.value}
              label={day.short}
              selected={tareDay === day.value}
              onPress={() => setTareDay(day.value)}
            />
          ))}
        </View>
        <Button
          label={tareDay === 'all' ? 'Zero all compartments' : `Zero ${labelFor(tareDay)}`}
          variant="secondary"
          onPress={runTare}
          loading={taring}
          disabled={!settings.backendUrl}
          fullWidth
        />
        {tareMessage && <AppText color={colors.textMuted}>{tareMessage}</AppText>}
      </Card>

      <SectionHeader title="LEDs" />
      <Card>
        <AppText color={colors.textMuted}>
          Blink every compartment LED for a few seconds to confirm wiring.
        </AppText>
        <Button
          label="Test all LEDs"
          variant="secondary"
          onPress={testLeds}
          loading={ledBusy}
          disabled={!settings.backendUrl}
          fullWidth
        />
        {ledMessage && <AppText color={colors.textMuted}>{ledMessage}</AppText>}
      </Card>

      <SectionHeader title="History" />
      <Card>
        <AppText color={colors.textMuted}>
          {results.length === 0
            ? 'No saved checks on this phone.'
            : `${results.length} saved ${results.length === 1 ? 'check' : 'checks'} on this phone.`}
        </AppText>
        <Button
          label="Clear history"
          variant="danger"
          onPress={clearHistory}
          disabled={results.length === 0}
          fullWidth
        />
      </Card>

      <Button
        label="Design preview (temporary)"
        variant="ghost"
        onPress={() => router.push('/design-preview')}
        fullWidth
      />
    </Screen>
  );
}

function labelFor(day: DayOfWeek): string {
  return WEEKDAYS[day - 1].long;
}

function DeviceStatus({ status }: { status: BackendStatus }) {
  return (
    <View style={styles.device}>
      <StatusLine
        label="Backend"
        ok={status.backend === 'ok'}
        detail={status.backend === 'ok' ? 'Reachable' : status.backend}
      />
      <StatusLine
        label="Camera"
        ok={status.camera.open}
        detail={
          status.camera.open
            ? `Open (index ${status.camera.index})`
            : status.camera.error || 'Not open'
        }
      />
      <StatusLine
        label="Scale"
        ok={status.scale.connected}
        detail={
          status.scale.connected
            ? `Connected${status.scale.port ? ` on ${status.scale.port}` : ''}`
            : status.scale.error || 'Not connected'
        }
      />
      <StatusLine
        label="Model"
        ok={status.model.configured}
        detail={status.model.configured ? 'Model ID is set' : 'ROBOFLOW_MODEL_ID is missing'}
      />
      {status.scale.weightsGrams && (
        <AppText variant="caption" color={colors.textSubtle}>
          Live grams Sun–Sat:{' '}
          {status.scale.weightsGrams
            .map((grams) => (grams == null ? '—' : formatGrams(grams)))
            .join(' · ')}
        </AppText>
      )}
    </View>
  );
}

function StatusLine({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <View style={styles.statusRow}>
      <AppText variant="label" style={styles.statusLabel}>
        {label}
      </AppText>
      <AppText color={ok ? colors.success : colors.warning} style={styles.flex}>
        {detail}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  device: {
    gap: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  statusLabel: {
    width: 72,
  },
  flex: {
    flex: 1,
  },
});
