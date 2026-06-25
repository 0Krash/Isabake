const lightColors = {
  appBackground: '#B3B2D6',
  screenBackground: '#EFECFF',
  surface: '#FEFCFF',
  surfaceMuted: '#EFECFF',
  fieldBackground: '#FEFCFF',
  fieldErrorBackground: '#FEEDED',
  textPrimary: '#3B3F3A',
  textSecondary: '#595263',
  textMuted: '#70677E',
  textInverse: '#FEFCFF',
  primary: '#6D37FF',
  primaryMuted: '#E5D6FF',
  primaryText: '#5B2ED1',
  inactiveText: '#6F687A',
  danger: '#CB0022',
  dangerSurface: '#FEEDED',
  success: '#699f4c',
  destructive: '#e88282',
  border: '#E2DDF2',
  backdrop: 'rgba(0, 0, 0, 0.8)',
  softBackdrop: 'rgba(0, 0, 0, 0.6)',
};

const darkColors = {
  appBackground: '#171421',
  screenBackground: '#211C2D',
  surface: '#2B2538',
  surfaceMuted: '#211C2D',
  fieldBackground: '#332B42',
  fieldErrorBackground: '#3A1E2A',
  textPrimary: '#F8F5FF',
  textSecondary: '#C6BED6',
  textMuted: '#A89FB8',
  textInverse: '#FEFCFF',
  primary: '#8E63FF',
  primaryMuted: '#403159',
  primaryText: '#D4C3FF',
  inactiveText: '#837B91',
  danger: '#FF6B86',
  dangerSurface: '#3A1E2A',
  success: '#79B85A',
  destructive: '#C45F66',
  border: '#40384F',
  backdrop: 'rgba(0, 0, 0, 0.82)',
  softBackdrop: 'rgba(0, 0, 0, 0.72)',
};

const themes = {
  dark: {
    colorScheme: 'dark',
    colors: darkColors,
  },
  light: {
    colorScheme: 'light',
    colors: lightColors,
  },
};

export default themes;
