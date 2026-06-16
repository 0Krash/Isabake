import { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
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
    // borderColor: 'red',
    // borderWidth: 2,
    flex: 1,
    marginHorizontal: 15,
  },
  selector: {
    flex: 1,
    borderRadius: 20,
    marginVertical: 10,
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 5,
  },
  baseTouchable: {
    width: '50%',
    height: '80%',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseTextTouchable: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    letterSpacing: 0,
  },
});
