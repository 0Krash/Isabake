import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import typography from '../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../context/TransactionBalanceThemeContext';

const tabs = [
  { key: 'home', label: 'Inicio' },
  { key: 'recipes', label: 'Recetas' },
  { key: 'inventory', label: 'Inventario' },
];

export default function AppBottomNavigation({ activeTab, onTabPress }) {
  const { colors } = useTransactionBalanceTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderTopColor: colors.border },
      ]}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;

        return (
          <Pressable
            key={tab.key}
            onPress={() => onTabPress(tab.key)}
            style={[
              styles.tab,
              isActive && { backgroundColor: colors.surfaceMuted },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: isActive ? colors.primaryText : colors.textSecondary },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    flexDirection: 'row',
    minHeight: Platform.OS === 'android' ? 112 : 64,
    paddingBottom: Platform.OS === 'android' ? 46 : 8,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  label: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  tab: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
});
