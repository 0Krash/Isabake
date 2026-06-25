import { useState } from 'react';
import { Keyboard, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import typography from '../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';

export default function SwitchSelector({ onTabChange }) {
  const [selectedTab, setSelectedTab] = useState('Ventas');
  const { colors } = useTransactionBalanceTheme();

  const handleTabChange = (tabName) => {
    setSelectedTab(tabName);
    if (onTabChange) onTabChange(tabName); // Llama a la función proporcionada por la prop onTabChange
  };

  return (
    <View style={styles.mainContainer}>
      <View style={[styles.selector, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[
            styles.baseTouchable,
            {
              backgroundColor:
                selectedTab == 'Ventas' ? colors.primaryMuted : colors.surface,
            },
          ]}
          onPress={() => {
            Keyboard.dismiss();
            handleTabChange('Ventas');
          }}
        >
          <Text
            style={[
              styles.baseTextTouchable,
              {
                color:
                  selectedTab == 'Ventas'
                    ? colors.primaryText
                    : colors.inactiveText,
              },
            ]}
          >
            Ventas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.baseTouchable,
            {
              backgroundColor:
                selectedTab == 'Gastos' ? colors.primaryMuted : colors.surface,
            },
          ]}
          onPress={() => {
            Keyboard.dismiss();
            handleTabChange('Gastos');
          }}
        >
          <Text
            style={[
              styles.baseTextTouchable,
              {
                color:
                  selectedTab == 'Gastos'
                    ? colors.primaryText
                    : colors.inactiveText,
              },
            ]}
          >
            Gastos
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    marginHorizontal: 15,
    marginVertical: 6,
  },
  selector: {
    alignItems: 'center',
    borderRadius: 16,
    flexDirection: 'row',
    height: 44,
    paddingHorizontal: 4,
  },
  baseTouchable: {
    alignItems: 'center',
    borderRadius: 12,
    height: 34,
    justifyContent: 'center',
    width: '50%',
  },
  baseTextTouchable: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    letterSpacing: 0,
  },
});
