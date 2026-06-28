import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import typography from '../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';
import { getConflictReason } from './conflictUiModel';

export { getConflictReason };

export default function ConflictListItem({ conflict, onPress, selected }) {
  const { colors } = useTransactionBalanceTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.container,
        {
          backgroundColor: selected ? colors.primaryMuted : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.collection, { color: colors.textPrimary }]}>
          {conflict.collection}
        </Text>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          {getConflictReason(conflict)}
        </Text>
      </View>
      <Text style={[styles.id, { color: colors.textSecondary }]}>
        {conflict.localId}
      </Text>
      <Text style={[styles.meta, { color: colors.textMuted }]}>
        Local v{conflict.localVersion || '-'} · Server v
        {conflict.serverVersion || '-'}
      </Text>
      <Text style={[styles.meta, { color: colors.textMuted }]}>
        {conflict.updatedAt || 'Sin fecha'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  collection: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  container: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  id: {
    fontSize: typography.sizes.bodySmall,
    marginTop: 6,
  },
  meta: {
    fontSize: typography.sizes.label,
    marginTop: 4,
  },
});
