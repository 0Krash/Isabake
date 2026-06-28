import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import typography from '../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';
import { stringifyPreviewData } from './conflictUiModel';

export { stringifyPreviewData };

export default function ConflictDataPreview({ data, title }) {
  const { colors } = useTransactionBalanceTheme();

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.textSecondary }]}>
        {title}
      </Text>
      <Text style={[styles.preview, { color: colors.textPrimary }]}>
        {stringifyPreviewData(data)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  preview: {
    fontFamily: 'Courier',
    fontSize: 12,
    marginTop: 8,
  },
  title: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
});
