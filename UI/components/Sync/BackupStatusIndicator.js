import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import typography from '../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';
import useBackupStatus from '../../hooks/sync/useBackupStatus';

const toneColor = (tone, colors) => {
  if (tone === 'success') {
    return colors.success;
  }

  if (tone === 'warning') {
    return '#B7791F';
  }

  if (tone === 'error') {
    return colors.danger;
  }

  if (tone === 'info') {
    return colors.primary;
  }

  return colors.textMuted;
};

export default function BackupStatusIndicator({
  onPrimaryAction,
  status,
  style,
} = {}) {
  const { colors } = useTransactionBalanceTheme();
  const fallback = useBackupStatus({ autoLoad: !status });
  const backupStatus = status || fallback.backupStatus;
  const accentColor = toneColor(backupStatus.tone, colors);

  if (!backupStatus?.showInMainScreens) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: accentColor }]} />
      <View style={styles.copy}>
        <Text
          numberOfLines={1}
          style={[styles.title, { color: colors.textPrimary }]}
        >
          {backupStatus.title}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.description, { color: colors.textMuted }]}
        >
          {backupStatus.description}
        </Text>
      </View>
      {backupStatus.primaryActionLabel && onPrimaryAction ? (
        <Pressable onPress={onPrimaryAction} style={styles.action}>
          <Text style={[styles.actionText, { color: colors.primary }]}>
            {backupStatus.primaryActionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    flexShrink: 0,
    paddingLeft: 8,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  container: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 15,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  description: {
    fontSize: typography.sizes.caption,
    marginTop: 1,
  },
  dot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  title: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
});
