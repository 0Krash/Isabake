import axios from 'axios';
import { URL_Transactions } from '@env';

const getAllTransactions = () => {
  return new Promise((resolve, reject) => {
    console.log(URL_Transactions);
    axios
      .get(URL_Transactions)
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
      .post(URL_Transactions, data)
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
