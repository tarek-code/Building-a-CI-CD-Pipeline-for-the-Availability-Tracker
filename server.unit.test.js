jest.mock('redis');
const fs = require('fs');
const path = require('path');
const { saveHistoryToFile, readHistoryFromFile } = require('./server');

const tempFile = path.join(__dirname, 'tempHistory.json');

afterAll(() => {
  if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
});

test('saveHistoryToFile should save data correctly', () => {
  const data = { a: 1 };
  const result = saveHistoryToFile(tempFile, data);
  expect(result).toBe(true);
  expect(fs.existsSync(tempFile)).toBe(true);
});

test('readHistoryFromFile should read saved data', () => {
  const data = readHistoryFromFile(tempFile);
  expect(data).toEqual({ a: 1 });
});

