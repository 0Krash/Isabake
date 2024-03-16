import { StyleSheet, View, Text, Button } from 'react-native';

function Dashboard() {
  return (
    <View style={styles.mainContainer}>
      <View style={styles.selector}>
        <View style={styles.buttonContainer}>
          <View>
            <Button title="G a s t o s" style={{ letterSpacing: 3 }} />
          </View>
          <View>
            <Button title="V e n t a s" />
          </View>
        </View>
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
    alignContent: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
});

export default Dashboard;
