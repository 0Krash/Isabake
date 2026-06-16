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

export default { getAllStores };
