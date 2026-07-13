import {
  APP_BOTTOM_NAV_CLEARANCE,
  APP_BOTTOM_NAV_HEIGHT_ANDROID,
  APP_BOTTOM_NAV_HEIGHT_IOS,
  APP_SCREEN_TOP_PADDING,
  MAIN_SCREEN_TOP_PADDING,
  getBottomNavHeight,
  getScrollContentBottomPadding,
  getScreenContentTopPadding,
} from './layoutMetrics';

describe('layoutMetrics', () => {
  test('uses stable bottom nav heights by platform', () => {
    expect(getBottomNavHeight('android')).toBe(APP_BOTTOM_NAV_HEIGHT_ANDROID);
    expect(getBottomNavHeight('ios')).toBe(APP_BOTTOM_NAV_HEIGHT_IOS);
  });

  test('keeps scroll content clear of the bottom navigation', () => {
    expect(getScrollContentBottomPadding({ platform: 'android' })).toBe(
      APP_BOTTOM_NAV_HEIGHT_ANDROID + APP_BOTTOM_NAV_CLEARANCE,
    );
    expect(getScrollContentBottomPadding({ extra: 12, platform: 'ios' })).toBe(
      APP_BOTTOM_NAV_HEIGHT_IOS + APP_BOTTOM_NAV_CLEARANCE + 12,
    );
  });

  test('keeps screen content below device status bars', () => {
    expect(getScreenContentTopPadding({ platform: 'ios', statusBarHeight: 54 })).toBe(
      APP_SCREEN_TOP_PADDING,
    );
    expect(
      getScreenContentTopPadding({ platform: 'android', statusBarHeight: 32 }),
    ).toBe(APP_SCREEN_TOP_PADDING + 32);
    expect(
      getScreenContentTopPadding({ platform: 'android', statusBarHeight: null }),
    ).toBe(APP_SCREEN_TOP_PADDING);
    expect(
      getScreenContentTopPadding({
        basePadding: 50,
        platform: 'android',
        statusBarHeight: 32,
      }),
    ).toBe(82);
  });

  test('keeps main screen workspace card close to the safe top edge', () => {
    expect(
      getScreenContentTopPadding({
        basePadding: MAIN_SCREEN_TOP_PADDING,
        platform: 'ios',
        statusBarHeight: 54,
      }),
    ).toBe(MAIN_SCREEN_TOP_PADDING);
    expect(
      getScreenContentTopPadding({
        basePadding: MAIN_SCREEN_TOP_PADDING,
        platform: 'android',
        statusBarHeight: 32,
      }),
    ).toBe(MAIN_SCREEN_TOP_PADDING + 32);
  });
});
