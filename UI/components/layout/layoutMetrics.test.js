import {
  APP_BOTTOM_NAV_CLEARANCE,
  APP_BOTTOM_NAV_HEIGHT_ANDROID,
  APP_BOTTOM_NAV_HEIGHT_IOS,
  getBottomNavHeight,
  getScrollContentBottomPadding,
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
});
