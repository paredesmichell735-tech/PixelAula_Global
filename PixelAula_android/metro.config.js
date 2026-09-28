const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// El contrato compartido vive fuera de la carpeta del proyecto: hay que
// decirle a Metro que lo vigile y que resuelva sus dependencias aquí.
const contractRoot = path.resolve(__dirname, '../shared/pixelaula-api');

config.watchFolders = [...(config.watchFolders ?? []), contractRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(contractRoot, 'node_modules'),
];
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
