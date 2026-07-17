import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';

import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';
import {
  APP_HORIZONTAL_PADDING,
  APP_SCREEN_TOP_PADDING,
  getScrollContentBottomPadding,
} from './layoutMetrics';

export default function AppScreen({
  children,
  contentContainerStyle,
  scroll = true,
  style,
}) {
  const { colors } = useTransactionBalanceTheme();
  const baseStyle = [
    styles.safeArea,
    { backgroundColor: colors.screenBackground },
    style,
  ];
  const contentStyle = [
    styles.content,
    { paddingBottom: getScrollContentBottomPadding({ platform: Platform.OS }) },
    contentContainerStyle,
  ];

  if (!scroll) {
    return (
      <SafeAreaView style={baseStyle}>
        <View style={contentStyle}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={baseStyle}>
      <ScrollView
        contentContainerStyle={contentStyle}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    gap: 14,
    paddingHorizontal: APP_HORIZONTAL_PADDING,
    paddingTop: APP_SCREEN_TOP_PADDING,
  },
  safeArea: {
    flex: 1,
  },
});
