const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Força instância única de React no bundle (corrige React error #527)
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "react":     path.resolve(__dirname, "node_modules/react"),
  "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
};

module.exports = withNativeWind(config, { input: "./global.css" });
