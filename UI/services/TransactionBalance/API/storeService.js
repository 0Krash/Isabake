import axios from 'axios';
import { URL_Stores } from '@env';

const getAllStores = () => {
  return new Promise((resolve, reject) => {
    console.log(URL_Stores);
    axios
      .get(URL_Stores)
      .then((response) => {
        resolve(response.data.data);
      })
      .catch((error) => {
        console.error('Error al hacer la petición desde getAllStores:', error);
        reject(error);
      });
  });
};

export default { getAllStores };
