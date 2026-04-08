module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  workerIdleMemoryLimit: 1024 * 1024 * 1024,
  roots: ["<rootDir>/src"],
  setupFilesAfterEnv: ["<rootDir>/src/jest.setup.ts"],
  moduleNameMapper: {
    "\\.(css|scss)$": "identity-obj-proxy"
  }
};
