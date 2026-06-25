import axios from 'axios';
import { API_HOST, URL_Inventory, URL_Recipes, URL_Stores } from '@env';

const isValidHttpUrl = (url) =>
  typeof url === 'string' &&
  /^https?:\/\//.test(url.trim()) &&
  !url.includes('${') &&
  !url.includes('`');

const getInventoryUrl = () => {
  if (isValidHttpUrl(URL_Inventory)) {
    return URL_Inventory.trim();
  }

  if (isValidHttpUrl(URL_Recipes)) {
    return URL_Recipes.replace('/recipes', '/inventory').trim();
  }

  if (isValidHttpUrl(URL_Stores)) {
    return URL_Stores.replace('/stores', '/inventory').trim();
  }

  if (isValidHttpUrl(API_HOST)) {
    return `${API_HOST.trim()}/api/v1/inventory`;
  }

  return '';
};

const inventoryUrl = getInventoryUrl();

const assertInventoryUrl = () => {
  if (!inventoryUrl) {
    throw new Error('URL de inventario no configurada');
  }
};

const getAllInventoryItems = async () => {
  try {
    assertInventoryUrl();
    const response = await axios.get(inventoryUrl);
    return response.data.data;
  } catch (error) {
    console.warn('Error al hacer la petición desde getAllInventoryItems:', error);
    throw error;
  }
};

const postInventoryItem = async (data) => {
  try {
    assertInventoryUrl();
    const response = await axios.post(inventoryUrl, data);
    return response.data;
  } catch (error) {
    console.warn('Error al hacer la petición desde postInventoryItem:', error);
    throw error;
  }
};

const updateInventoryItemById = async (inventoryId, data) => {
  try {
    assertInventoryUrl();
    const response = await axios.patch(`${inventoryUrl}/${inventoryId}`, data);
    return response.data;
  } catch (error) {
    console.warn('Error al hacer la petición desde updateInventoryItemById:', error);
    throw error;
  }
};

const deleteInventoryItemById = async (inventoryId) => {
  try {
    assertInventoryUrl();
    const response = await axios.delete(`${inventoryUrl}/${inventoryId}`);
    return response.data;
  } catch (error) {
    console.warn('Error al hacer la petición desde deleteInventoryItemById:', error);
    throw error;
  }
};

export default {
  deleteInventoryItemById,
  getAllInventoryItems,
  inventoryUrl,
  postInventoryItem,
  updateInventoryItemById,
};
