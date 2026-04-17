const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

// Core module for metro.config features.

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
