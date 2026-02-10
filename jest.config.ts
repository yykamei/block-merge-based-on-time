export default {
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  preset: "ts-jest",
  resolver: "./jest-resolver.js",
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": "ts-jest",
    "node_modules[/\\\\]@actions[/\\\\].+\\.js$": "ts-jest",
  },
  transformIgnorePatterns: ["/node_modules/(?!@actions/)"],
}
