import axios from 'axios';
import { StyleSheet, Alert, View, Button, SafeAreaView } from 'react-native';
import { API_URL } from '@env';
import TransactionBalanceScreen from './screens/TransactionBalanceScreen';

export default function App() {
  const fetchDataFromBackend = () => {
    axios
      .get(`${API_URL}`)
      .then((response) => {
        console.log(response.data);
        // Aquí puedes manejar la respuesta del servidor
        Alert.alert('Respuesta del servidor', JSON.stringify(response.data));
      })
      .catch((error) => {
        console.error('Error al hacer la petición:', error);
        // Aquí puedes manejar cualquier error que ocurra durante la petición
        Alert.alert('Error', 'Hubo un error al obtener los datos del servidor');
      });
  };

  const postDataToBackend = () => {
    const data = {
      name: `name${Math.random()}`,
      duration: 5,
      price: 200,
    };

    axios
      .post(`${API_URL}`, data)
      .then((response) => {
        console.log(response.data);
        // Aquí puedes manejar la respuesta del servidor
        Alert.alert('Respuesta del servidor', JSON.stringify(response.data));
      })
      .catch((error) => {
        console.error('Error al hacer la petición:', error);
        // Aquí puedes manejar cualquier error que ocurra durante la petición
        Alert.alert('Error', 'Hubo un error al obtener los datos del servidor');
      });
  };

  return (
    // <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    //   <Button
    //     title="Obtener datos del servidor"
    //     onPress={fetchDataFromBackend}
    //   />
    //   <Button title="Postear datos al servidor" onPress={postDataToBackend} />
    // </View>
    <SafeAreaView style={styles.container}>
      <TransactionBalanceScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#B3B2D6',
    // alignItems: 'center',
    // justifyContent: 'center',
  },
});
