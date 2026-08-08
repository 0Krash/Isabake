import { Keyboard, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';
import AppIcon from '../icons/AppIcon';

export default function AddTransactionButton({
  setAddTransactionModalIsVisible,
}) {
  const { colors } = useTransactionBalanceTheme();

  return (
    <TouchableOpacity
      style={[styles.mainContainer, { backgroundColor: colors.primary }]}
      onPress={() => {
        Keyboard.dismiss();
        setAddTransactionModalIsVisible(true);
      }}
    >
      <View style={styles.iconContainer}>
        <AppIcon
          accessibilityLabel="Agregar transacción"
          color={colors.textInverse}
          name="plus"
          size={30}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
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
});
