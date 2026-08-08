const mockDatabase = {
  execAsync: jest.fn(async () => null),
  getAllAsync: jest.fn(async () => []),
  getFirstAsync: jest.fn(async () => null),
  runAsync: jest.fn(async () => ({ changes: 0, lastInsertRowId: 0 })),
};

module.exports = {
  openDatabaseAsync: jest.fn(async () => mockDatabase),
};
