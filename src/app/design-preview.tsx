import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DemoBadge } from '@/components/DemoBadge';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/StateViews';
import { StatusBadge } from '@/components/StatusBadge';
import { colors, spacing } from '@/theme';

// Temporary screen for checking the design system. Remove once real screens exist.
export default function DesignPreviewScreen() {
  const [loading, setLoading] = useState(false);

  const simulateLoading = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1500);
  };

  return (
    <Screen>
      <Card>
        <AppText variant="title">Title</AppText>
        <AppText variant="heading">Heading</AppText>
        <AppText variant="subheading">Subheading</AppText>
        <AppText>Body text for descriptions and longer explanations.</AppText>
        <AppText variant="label" color={colors.textMuted}>
          LABEL
        </AppText>
        <AppText variant="caption" color={colors.textSubtle}>
          Caption · Last checked 9:41 AM
        </AppText>
      </Card>

      <SectionHeader title="Status badges" actionLabel="See all" onActionPress={() => {}} />
      <Card>
        <View style={styles.wrap}>
          <StatusBadge status="not_checked" />
          <StatusBadge status="verified" />
          <StatusBadge status="mismatch" />
          <StatusBadge status="needs_review" />
          <DemoBadge />
        </View>
        <StatusBadge status="verified" label="Checks passed" size="lg" />
        <StatusBadge status="mismatch" size="lg" />
        <StatusBadge status="needs_review" size="lg" />
      </Card>

      <SectionHeader title="Buttons" />
      <Card>
        <Button label="Verify a refill" icon={{ ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' }} onPress={simulateLoading} loading={loading} fullWidth />
        <Button label="Secondary" variant="secondary" onPress={() => {}} />
        <Button label="Ghost" variant="ghost" onPress={() => {}} />
        <Button label="Delete" variant="danger" onPress={() => {}} />
        <Button label="Disabled" onPress={() => {}} disabled />
      </Card>

      <SectionHeader title="Pressable card" />
      <Card onPress={() => {}} accessibilityLabel="Monday compartment">
        <View style={styles.rowBetween}>
          <AppText variant="subheading">Monday</AppText>
          <StatusBadge status="verified" />
        </View>
        <AppText color={colors.textMuted}>2 × blue_round, 1 × white_oval</AppText>
        <AppText variant="caption" color={colors.textSubtle}>
          Last checked today, 8:02 AM
        </AppText>
      </Card>

      <SectionHeader title="States" />
      <Card>
        <EmptyState
          title="No medications yet"
          message="Add your first medication to build your weekly pillbox."
          action={{ label: 'Add medication', onPress: () => {} }}
        />
      </Card>
      <Card>
        <LoadingState message="Running demo check…" />
      </Card>
      <Card>
        <ErrorState message="Could not load your history." onRetry={() => {}} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
