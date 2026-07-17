const store = new Map();

const deleteItemAsync = jest.fn(async (key) => {
  store.delete(key);
});

const getItemAsync = jest.fn(async (key) => store.get(key) || null);

const setItemAsync = jest.fn(async (key, value) => {
  store.set(key, value);
});

const __clear = () => {
  store.clear();
  deleteItemAsync.mockClear();
  getItemAsync.mockClear();
  setItemAsync.mockClear();
};

module.exports = {
  __clear,
  deleteItemAsync,
  getItemAsync,
  setItemAsync,
};
