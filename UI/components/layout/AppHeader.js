import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import typography from '../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';

export default function AppHeader({
  actionLabel,
  onAction,
  subtitle,
  title,
}) {
  const { colors } = useTransactionBalanceTheme();

  return (
    <View style={styles.header}>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={[styles.action, { borderColor: colors.border }]}
        >
          <Text style={[styles.actionText, { color: colors.textPrimary }]}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 12,
  },
  actionText: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  copy: {
    flex: 1,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  subtitle: {
    fontSize: typography.sizes.bodySmall,
    marginTop: 4,
  },
  title: {
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
  },
});
