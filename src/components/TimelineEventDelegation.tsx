import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme/theme';
import type { SerializedTimelineEvent } from '../types/task';

interface TimelineEventDelegationProps {
  event: SerializedTimelineEvent;
}

/**
 * Renders REASSIGNED events with three sub-types:
 * 1. Delegation — temporary hand-off (delegatedBy + delegatedTo in data)
 * 2. Revocation — delegation cleared (revokeDelegation: true)
 * 3. Full reassignment — permanent owner change (from + to)
 */
function TimelineEventDelegation({ event }: TimelineEventDelegationProps) {
  const { data, delegationSummary } = event;

  const delegatedBy = data.delegatedBy as string | undefined;
  const delegatedTo = data.delegatedTo as string | undefined;
  const isRevocation = data.revokeDelegation === true;
  const from = data.from as string | undefined;
  const to = data.to as string | undefined;
  const note = data.note as string | undefined;
  const reason = data.reason as string | undefined;

  // Use delegationSummary if available (server-side enriched)
  const summaryDelegatedTo = delegationSummary?.delegatedTo?.name;
  const summaryDelegatedBy = delegationSummary?.delegatedBy?.name;

  // Delegation (temporary hand-off)
  if (delegatedBy && delegatedTo) {
    return (
      <View style={styles.container}>
        <View style={styles.banner}>
          <Ionicons name="people" size={14} color={colors.warning} />
          <Text style={styles.bannerText}>
            Delegated to{' '}
            <Text style={styles.highlight}>
              {summaryDelegatedTo ?? delegatedTo}
            </Text>
            {summaryDelegatedBy ? (
              <Text> by {summaryDelegatedBy}</Text>
            ) : null}
          </Text>
        </View>
        {note ? <Text style={styles.note}>{note}</Text> : null}
      </View>
    );
  }

  // Revocation (delegation cleared)
  if (isRevocation) {
    return (
      <View style={styles.container}>
        <View style={[styles.banner, styles.revokeBanner]}>
          <Ionicons name="return-up-back" size={14} color={colors.error} />
          <Text style={styles.bannerText}>
            Delegation revoked
            {reason ? ` — ${reason}` : ''}
          </Text>
        </View>
      </View>
    );
  }

  // Full reassignment (permanent)
  const fromName = data.fromName as string | undefined;
  const toName = data.toName as string | undefined;
  return (
    <View style={styles.container}>
      <View style={[styles.banner, styles.reassignBanner]}>
        <Ionicons name="swap-horizontal" size={14} color={colors.info} />
        <Text style={styles.bannerText}>
          Reassigned{fromName ? ` from ${fromName}` : from ? ` from ${from}` : ''}
          {toName ? ` to ${toName}` : to ? ` to ${to}` : ''}
        </Text>
      </View>
      {reason ? <Text style={styles.note}>{reason}</Text> : null}
    </View>
  );
}

export default React.memo(TimelineEventDelegation);

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xs,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  revokeBanner: {
    backgroundColor: colors.errorLight,
  },
  reassignBanner: {
    backgroundColor: colors.infoLight,
  },
  bannerText: {
    fontSize: typography.sm,
    color: colors.text,
    flexShrink: 1,
  },
  highlight: {
    fontWeight: typography.semibold,
    color: colors.warning,
  },
  note: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
});
