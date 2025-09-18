module.exports = {
    createClient: () => ({
      connect: jest.fn(),
      on: jest.fn(),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(true),
      isOpen: true,
    }),
  };
  