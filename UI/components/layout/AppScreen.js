import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  Platform,
  RefreshControl,
  StyleSheet,
  StatusBar,
  useColorScheme,
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
  const colorScheme = useColorScheme();
  const statusBarStyle = colorScheme === 'dark' ? 'light-content' : 'dark-content';
  const baseStyle = [
    styles.safeArea,
    { backgroundColor: colors.appBackground || colors.screenBackground },
    style,
  ];
  const contentStyle = [
    styles.content,
    {
      backgroundColor: colors.screenBackground,
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
        <StatusBar
          backgroundColor={colors.appBackground || colors.screenBackground}
          barStyle={statusBarStyle}
          translucent={false}
        />
        <View style={contentStyle}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={baseStyle}>
      <StatusBar
        backgroundColor={colors.appBackground || colors.screenBackground}
        barStyle={statusBarStyle}
        translucent={false}
      />
      <ScrollView
        alwaysBounceVertical={Boolean(onRefresh)}
        bounces={Boolean(onRefresh)}
        contentContainerStyle={contentStyle}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        overScrollMode="never"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              onRefresh={onRefresh}
              refreshing={Boolean(refreshing)}
              tintColor={colors.primary}
            />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}
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
