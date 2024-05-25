import axios from 'axios';
import { URL_Transactions } from '@env';

exports.getAllTransactions = () => {
  return new Promise((resolve, reject) => {
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

exports.postTransaction = (data) => {
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

exports.deleteTransactionById = (transactionId) => {
  return new Promise((resolve, reject) => {
    axios
      .delete(`${URL_Transactions}/${transactionId}`)
      .then((response) => {
        resolve(response.data);
      })
      .catch((error) => {
        console.error(
          'Error al hacer la petición desde deleteTransaction:',
          error
        );
        reject(error);
      });
  });
};

exports.getTotalAmountByCategory = () => {
  return new Promise((resolve, reject) => {
    axios
      .get(`${URL_Transactions}/totalAmountByCategory`)
      .then((response) => {
        resolve(response.data);
      })
      .catch((error) => {
        console.error(
          'Error al hacer la petición desde getTotalAmountByCategory:',
          error
        );
        reject(error);
      });
  });
};

exports.getTotalAmountByDateCategory = () => {
  return new Promise((resolve, reject) => {
    axios
      .get(`${URL_Transactions}/totalAmountByDateCategory`)
      .then((response) => {
        resolve(response.data);
      })
      .catch((error) => {
        console.error(
          'Error al hacer la petición desde getTotalAmountByDateCategory:',
          error
        );
        reject(error);
      });
  });
};
