import { StyleSheet, View, Text } from 'react-native';

function Dashboard() {
  return (
    <View style={styles.mainContainer}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Balance Total</Text>
      </View>
      <View style={styles.balances}></View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    // borderColor: 'blue',
    // borderWidth: 2,
    flex: 1,
    marginHorizontal: 15,
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    color: '#9E9AAB',
    fontWeight: 'bold',
    position: 'absolute',
    bottom: 10,
  },
  balances: {
    flex: 3,
    backgroundColor: '#FEFCFF',
    borderRadius: 20,
    marginBottom: 10,
  },
});

export default Dashboard;
