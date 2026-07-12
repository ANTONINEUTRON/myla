const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Required for @solana/web3.js and @noble/hashes which use the package.json
// "exports" field for subpath resolution (e.g. @noble/hashes/crypto.js).
// Without this, Metro falls back to broken file-based resolution.
config.resolver.unstable_enablePackageExports = true;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === "@noble/hashes/crypto.js" ||
    (moduleName === "./crypto.js" && context.originModulePath.includes("noble"))
  ) {
    console.log(`\n[Metro Resolver] Redirecting ${moduleName} in ${context.originModulePath} to @noble/hashes/crypto`);
    return context.resolveRequest(context, "@noble/hashes/crypto", platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });

