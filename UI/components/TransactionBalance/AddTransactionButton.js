import { StyleSheet, TouchableOpacity, Text, View } from 'react-native';

export default function AddTransactionButton({
  setAddTransactionModalIsVisible,
}) {
  return (
    <TouchableOpacity
      style={styles.mainContainer}
      onPress={() => {
        setAddTransactionModalIsVisible(true);
      }}
    >
      <View style={{ height: 48, justifyContent: 'center' }}>
        <Text
          style={{
            fontSize: 40,
            fontWeight: '300',
            color: '#FEFCFF',
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
