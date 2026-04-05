module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  workerIdleMemoryLimit: "1GB",
  roots: ["<rootDir>/src"],
  setupFilesAfterEnv: ["<rootDir>/src/jest.setup.ts"],
  moduleNameMapper: {
    "\\.(css|scss)$": "identity-obj-proxy"
  }
};
