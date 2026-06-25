import axios from 'axios';
import { URL_Stores } from '@env';

const getAllStores = async () => {
  try {
    const response = await axios.get(URL_Stores);
    return response.data.data;
  } catch (error) {
    console.error('Error al hacer la petición desde getAllStores:', error);
    throw error;
  }
};

const postStore = async (data) => {
  try {
    const response = await axios.post(URL_Stores, data);
    return response.data;
  } catch (error) {
    console.error('Error al hacer la petición desde postStore:', error);
    throw error;
  }
};

const updateStoreById = async (storeId, data) => {
  try {
    const response = await axios.patch(`${URL_Stores}/${storeId}`, data);
    return response.data;
  } catch (error) {
    console.error('Error al hacer la petición desde updateStoreById:', error);
    throw error;
  }
};

const deleteStoreById = async (storeId) => {
  try {
    const response = await axios.delete(`${URL_Stores}/${storeId}`);
    return response.data;
  } catch (error) {
    console.error('Error al hacer la petición desde deleteStoreById:', error);
    throw error;
  }
};

export default {
  deleteStoreById,
  getAllStores,
  postStore,
  updateStoreById,
};
