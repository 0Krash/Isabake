import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import typography from '../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';

export default function AppButton({
  children,
  disabled = false,
  onPress,
  style,
  variant = 'primary',
}) {
  const { colors } = useTransactionBalanceTheme();
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        isPrimary
          ? { backgroundColor: disabled ? colors.border : colors.primary }
          : { borderColor: colors.border, borderWidth: 1 },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: isPrimary ? colors.textInverse : colors.textPrimary },
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  text: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: typography.weights.semibold,
  },
});
