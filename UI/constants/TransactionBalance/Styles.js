import { StyleSheet } from 'react-native';
import typography from './Typography';

export const createStylesBase = (colors) =>
  StyleSheet.create({
    inputBox: { flex: 0 },
    textInputBase: {
      backgroundColor: colors.fieldBackground,
      borderColor: colors.border,
      borderRadius: 15,
      borderWidth: 1,
      color: colors.textPrimary,
      fontSize: typography.sizes.bodyLarge,
      height: 52,
      margin: 10,
      padding: 15,
      textAlign: 'center',
    },
    textInputLabelBase: {
      marginTop: 10,
      fontSize: typography.sizes.label,
      marginLeft: 15,
      color: colors.textMuted,
      fontWeight: typography.weights.medium,
    },
    textInputBaseValidationError: {
      backgroundColor: colors.fieldErrorBackground,
      borderRadius: 15,
      fontSize: typography.sizes.bodyLarge,
      height: 52,
      margin: 10,
      padding: 15,
      textAlign: 'center',
      borderColor: colors.danger,
      borderWidth: 1,
      color: colors.textPrimary,
    },
    textInputLabelValidationError: {
      marginTop: 10,
      fontSize: typography.sizes.label,
      marginLeft: 15,
      color: colors.danger,
      fontWeight: typography.weights.medium,
    },
    textInputErrorValidationError: {
      marginTop: -8,
      fontSize: typography.sizes.caption,
      marginLeft: 15,
      color: colors.danger,
      fontWeight: typography.weights.medium,
    },
  });

const stylesBase = StyleSheet.create({
  inputBox: { flex: 0 },
  textInputBase: {
    backgroundColor: '#FEFCFF',
    borderRadius: 15,
    fontSize: typography.sizes.bodyLarge,
    height: 52,
    margin: 10,
    padding: 15,
    textAlign: 'center',
  },
  textInputLabelBase: {
    marginTop: 10,
    fontSize: typography.sizes.label,
    marginLeft: 15,
    color: '#9E9AAB',
    fontWeight: typography.weights.medium,
  },
  textInputBaseValidationError: {
    backgroundColor: '#FEEDED',
    borderRadius: 15,
    fontSize: typography.sizes.bodyLarge,
    height: 52,
    margin: 10,
    padding: 15,
    textAlign: 'center',
    borderColor: '#CB0022',
    borderWidth: 1,
  },
  textInputLabelValidationError: {
    marginTop: 10,
    fontSize: typography.sizes.label,
    marginLeft: 15,
    color: '#CB0022',
    fontWeight: typography.weights.medium,
  },
  textInputErrorValidationError: {
    marginTop: -8,
    fontSize: typography.sizes.caption,
    marginLeft: 15,
    color: '#CB0022',
    fontWeight: typography.weights.medium,
  },
});

export default stylesBase;
