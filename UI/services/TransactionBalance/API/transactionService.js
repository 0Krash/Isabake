import axios from 'axios';
import { API_URL } from '@env';

const getAllTransactions = () => {
  return new Promise((resolve, reject) => {
    axios
      .get(API_URL)
      .then((response) => {
        resolve(response.data.data);
      })
      .catch((error) => {
        console.error(
          'Error al hacer la petición desde getAllTransactions:',
          error
        );
        reject(error);
      });
  });
};

const postTransaction = (data) => {
  return new Promise((resolve, reject) => {
    axios
      .post(API_URL, data)
      .then((response) => {
        resolve(response.data);
      })
      .catch((error) => {
        console.error(
          'Error al hacer la petición desde postTransaction:',
          error
        );
        reject(error);
      });
  });
};

export default { getAllTransactions, postTransaction };
