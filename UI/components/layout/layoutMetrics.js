export const APP_HORIZONTAL_PADDING = 20;
export const APP_SCREEN_TOP_PADDING = 18;
export const APP_BOTTOM_NAV_HEIGHT_ANDROID = 112;
export const APP_BOTTOM_NAV_HEIGHT_IOS = 64;
export const APP_BOTTOM_NAV_CLEARANCE = 28;
export const DEFAULT_PLATFORM = 'ios';

export const getBottomNavHeight = (platform = DEFAULT_PLATFORM) =>
  platform === 'android'
    ? APP_BOTTOM_NAV_HEIGHT_ANDROID
    : APP_BOTTOM_NAV_HEIGHT_IOS;

export const getScrollContentBottomPadding = ({
  extra = 0,
  platform = DEFAULT_PLATFORM,
} = {}) => getBottomNavHeight(platform) + APP_BOTTOM_NAV_CLEARANCE + extra;

export default {
  APP_BOTTOM_NAV_CLEARANCE,
  APP_BOTTOM_NAV_HEIGHT_ANDROID,
  APP_BOTTOM_NAV_HEIGHT_IOS,
  APP_HORIZONTAL_PADDING,
  APP_SCREEN_TOP_PADDING,
  DEFAULT_PLATFORM,
  getBottomNavHeight,
  getScrollContentBottomPadding,
};
