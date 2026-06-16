import axios from 'axios';
import { URL_Transactions } from '@env';

const getAllTransactions = async () => {
  try {
    const response = await axios.get(URL_Transactions);
    return response.data.data;
  } catch (error) {
    console.error(
      'Error al hacer la petición desde getAllTransactions:',
      error
    );
    throw error;
  }
};

const postTransaction = async (data) => {
  try {
    const response = await axios.post(URL_Transactions, data);
    return response.data;
  } catch (error) {
    console.error('Error al hacer la petición desde postTransaction:', error);
    throw error;
  }
};

const deleteTransactionById = async (transactionId) => {
  try {
    const response = await axios.delete(`${URL_Transactions}/${transactionId}`);
    return response.data;
  } catch (error) {
    console.error('Error al hacer la petición desde deleteTransaction:', error);
    throw error;
  }
};

const getTotalAmountByCategory = async () => {
  try {
    const response = await axios.get(`${URL_Transactions}/totalAmountByCategory`);
    return response.data;
  } catch (error) {
    console.error(
      'Error al hacer la petición desde getTotalAmountByCategory:',
      error
    );
    throw error;
  }
};

const getTotalAmountByDateCategory = async () => {
  try {
    const response = await axios.get(
      `${URL_Transactions}/totalAmountByDateCategory`
    );
    return response.data;
  } catch (error) {
    console.error(
      'Error al hacer la petición desde getTotalAmountByDateCategory:',
      error
    );
    throw error;
  }
};

export default {
  deleteTransactionById,
  getAllTransactions,
  getTotalAmountByCategory,
  getTotalAmountByDateCategory,
  postTransaction,
};
