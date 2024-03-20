import { StyleSheet, TouchableOpacity, Text, View } from 'react-native';

export default function AddTransactionButton() {
  return (
    <TouchableOpacity style={styles.mainContainer}>
      <View style={{ height: 52 }}>
        <Text
          style={{
            fontSize: 35,
            fontWeight: '300',
            color: '#FEFCFF',
            textAlign: 'center',
          }}
        >
          +
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    position: 'absolute',
    top: '3%',
    left: '80%',
    backgroundColor: '#6D37FF',
    height: 50,
    width: 50,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
