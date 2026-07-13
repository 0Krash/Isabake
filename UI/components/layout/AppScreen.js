import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  Platform,
  RefreshControl,
  StyleSheet,
  StatusBar,
  View,
} from 'react-native';

import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';
import {
  APP_HORIZONTAL_PADDING,
  getScrollContentBottomPadding,
  getScreenContentTopPadding,
} from './layoutMetrics';

export default function AppScreen({
  children,
  contentContainerStyle,
  onRefresh,
  refreshing = false,
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
    {
      paddingBottom: getScrollContentBottomPadding({ platform: Platform.OS }),
      paddingTop: getScreenContentTopPadding({
        platform: Platform.OS,
        statusBarHeight: StatusBar.currentHeight,
      }),
    },
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
        refreshControl={
          onRefresh ? (
            <RefreshControl
              onRefresh={onRefresh}
              refreshing={Boolean(refreshing)}
              tintColor={colors.primary}
            />
          ) : undefined
        }
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
  },
  safeArea: {
    flex: 1,
  },
});
