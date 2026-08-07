module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  moduleNameMapper: {
    '^@env$': '<rootDir>/test/__mocks__/env.js',
    '^expo-constants$': '<rootDir>/test/__mocks__/expoConstants.js',
    '^expo-secure-store$': '<rootDir>/test/__mocks__/expoSecureStore.js',
    '^expo-sqlite$': '<rootDir>/test/__mocks__/expoSqlite.js',
  },
};
