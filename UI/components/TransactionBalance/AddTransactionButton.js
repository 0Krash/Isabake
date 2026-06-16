import { StyleSheet, TouchableOpacity, Text, View } from 'react-native';
import typography from '../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';

export default function AddTransactionButton({
  setAddTransactionModalIsVisible,
}) {
  const { colors } = useTransactionBalanceTheme();

  return (
    <TouchableOpacity
      style={[styles.mainContainer, { backgroundColor: colors.primary }]}
      onPress={() => {
        setAddTransactionModalIsVisible(true);
      }}
    >
      <View style={styles.iconContainer}>
        <Text style={[styles.iconText, { color: colors.textInverse }]}>+</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    position: 'absolute',
    top: '3%',
    left: '80%',
    height: 50,
    width: 50,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    height: 48,
    justifyContent: 'center',
  },
  iconText: {
    fontSize: typography.sizes.displayAmount,
    fontWeight: '300',
    lineHeight: 46,
  },
});
