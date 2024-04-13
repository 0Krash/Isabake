import { StyleSheet } from 'react-native';

export default stylesBase = StyleSheet.create({
  inputBox: { flex: 0 },
  textInputBase: {
    backgroundColor: '#FEFCFF',
    borderRadius: 15,
    fontSize: 19,
    height: 50,
    margin: 10,
    padding: 15,
    textAlign: 'center',
  },
  textInputLabelBase: {
    marginTop: 10,
    fontSize: 15,
    marginLeft: 15,
    color: '#9E9AAB',
    fontWeight: '500',
  },
  textInputBaseValidationError: {
    backgroundColor: '#FEEDED',
    borderRadius: 15,
    fontSize: 19,
    height: 50,
    margin: 10,
    padding: 15,
    textAlign: 'center',
    borderColor: '#CB0022',
    borderWidth: 1,
  },
  textInputLabelValidationError: {
    marginTop: 10,
    fontSize: 15,
    marginLeft: 15,
    color: '#CB0022',
    fontWeight: '500',
  },
  textInputErrorValidationError: {
    marginTop: -8,
    fontSize: 10,
    marginLeft: 15,
    color: '#CB0022',
    fontWeight: '500',
  },
});
