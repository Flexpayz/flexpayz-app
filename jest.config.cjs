module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
  transform: {
    "^.+\\.(ts|tsx|js|jsx)$": "babel-jest",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  moduleNameMapper: {
    "\\.svg\\?react$": "<rootDir>/src/test/svgReactMock.tsx",
    "\\.(css|less|sass|scss)$": "<rootDir>/src/test/styleMock.js",
    "\\.(gif|ttf|eot|svg|png|jpg|jpeg|webp)$": "<rootDir>/src/test/fileMock.js",
  },
  testPathIgnorePatterns: ["/node_modules/", "/build/", "/dist/"],
};
