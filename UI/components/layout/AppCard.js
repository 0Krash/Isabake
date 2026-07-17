import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';

export default function AppCard({ children, style }) {
  const { colors } = useTransactionBalanceTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    gap: 10,
    padding: 14,
  },
});
