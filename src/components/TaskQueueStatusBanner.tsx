import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTaskQueueStatus, retryFailedJobs, clearFailedJobs, clearAllPendingJobs } from '../api/endpoints/taskSubmissionQueue';
import { colors, spacing, radius, typography, shadow } from '../theme/theme';

export default function TaskQueueStatusBanner() {
  const [status, setStatus] = useState(getTaskQueueStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(getTaskQueueStatus());
    }, 2000); // Check every 2 seconds for UI responsiveness
    return () => clearInterval(interval);
  }, []);

  const handleCancelAll = () => {
    Alert.alert(
      'Cancel Submissions',
      'Are you sure you want to cancel all pending task submissions? Unsubmitted tasks will be stopped.',
      [
        { text: 'Keep Submitting', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: async () => {
            await clearAllPendingJobs();
            setStatus(getTaskQueueStatus());
          }
        }
      ]
    );
  };

  const handleClearFailed = () => {
    Alert.alert(
      'Clear Failed Tasks',
      'Are you sure you want to permanently clear all failed task submissions? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: async () => {
            await clearFailedJobs();
            setStatus(getTaskQueueStatus());
          }
        }
      ]
    );
  };

  const handleRetryAll = async () => {
    await retryFailedJobs();
    setStatus(getTaskQueueStatus());
  };

  if (status.pendingCount === 0 && status.failedCount === 0) return null;

  return (
    <View style={styles.container}>
      {status.pendingCount > 0 && (
        <View style={[styles.banner, styles.pendingBanner]}>
          <ActivityIndicator size="small" color={colors.primary} style={styles.icon} />
          <View style={styles.pendingTextWrap}>
            <Text style={styles.text}>
              {status.syncing ? 'Processing' : 'Waiting for connection'}: {status.pendingCount} task{status.pendingCount > 1 ? 's' : ''} remaining...
            </Text>
            <TouchableOpacity onPress={handleCancelAll} style={styles.actionBtn}>
              <Text style={styles.actionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {status.failedCount > 0 && (
        <View style={[styles.banner, styles.failedBanner]}>
          <Ionicons name="warning-outline" size={20} color={colors.error} style={styles.icon} />
          <View style={styles.failedTextWrap}>
            <Text style={[styles.text, styles.failedText]}>
              {status.failedCount} task{status.failedCount > 1 ? 's' : ''} failed to upload.
            </Text>
            <View style={styles.actions}>
              <TouchableOpacity onPress={handleRetryAll} style={styles.actionBtn}>
                <Text style={styles.actionText}>Retry All</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity onPress={handleClearFailed} style={styles.actionBtn}>
                <Text style={styles.actionText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    ...shadow.sm,
  },
  pendingBanner: {
    backgroundColor: '#F0F7FF',
    borderColor: '#C2E0FF',
  },
  failedBanner: {
    backgroundColor: '#FFF1F0',
    borderColor: '#FFCCC7',
  },
  icon: {
    marginRight: spacing.sm,
  },
  text: {
    fontSize: typography.sm,
    color: colors.text,
  },
  pendingTextWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  failedTextWrap: {
    flex: 1,
  },
  failedText: {
    fontWeight: typography.semibold,
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    paddingVertical: 2,
  },
  actionText: {
    fontSize: typography.xs,
    color: colors.primary,
    fontWeight: typography.bold,
    textTransform: 'uppercase',
  },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: '#FFCCC7',
    marginHorizontal: spacing.sm,
  },
});
