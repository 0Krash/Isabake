module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  moduleNameMapper: {
    '^@env$': '<rootDir>/test/__mocks__/env.js',
    '^expo-secure-store$': '<rootDir>/test/__mocks__/expoSecureStore.js',
  },
};
