import { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';

export default function SwitchSelector() {
  const [selectedTab, setSelectedTab] = useState('Ventas');
  return (
    <View style={styles.mainContainer}>
      <View style={styles.selector}>
        <TouchableOpacity
          style={[
            styles.baseTouchable,
            {
              backgroundColor: selectedTab == 'Ventas' ? '#E5D6FF' : '#FEFCFF',
            },
          ]}
          onPress={() => {
            setSelectedTab('Ventas');
          }}
        >
          <Text
            style={[
              styles.baseTextTouchable,
              { color: selectedTab == 'Ventas' ? '#9777DC' : '#B7B4B7' },
            ]}
          >
            Ventas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.baseTouchable,
            {
              backgroundColor: selectedTab == 'Gastos' ? '#E5D6FF' : '#FEFCFF',
            },
          ]}
          onPress={() => {
            setSelectedTab('Gastos');
          }}
        >
          <Text
            style={[
              styles.baseTextTouchable,
              { color: selectedTab == 'Gastos' ? '#9777DC' : '#B7B4B7' },
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
    flex: 0.5,
    marginHorizontal: 15,
  },
  selector: {
    flex: 1,
    backgroundColor: '#FEFCFF',
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
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
});
