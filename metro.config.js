const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add WASM as a supported asset extension to support expo-sqlite on web
config.resolver.assetExts.push('wasm');

module.exports = config;
