#!/usr/bin/env node

/**
 * Direct OTA Release Bundle Generator
 * Generates offline/cloud-ready JS bundles and manifest.json without app store resubmission.
 *
 * Usage:
 *   node scripts/release-ota.js --platform=android --version=1.0.1
 *   node scripts/release-ota.js --platform=ios --version=1.0.1
 *   node scripts/release-ota.js --platform=all --version=1.0.1
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2).reduce((acc, arg) => {
  const [k, v] = arg.replace(/^--/, '').split('=');
  acc[k] = v || true;
  return acc;
}, {});

const platform = args.platform || 'all';
const version = args.version || '1.0.1';
const changelog = args.changelog || `UI update release v${version}`;

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist', 'ota');

console.log('==============================================');
console.log(`🚀 Starting OTA Release Generator`);
console.log(`📦 Target Version: ${version}`);
console.log(`📱 Platform:       ${platform}`);
console.log('==============================================\n');

// Ensure output directory exists
fs.mkdirSync(distDir, { recursive: true });

function bundlePlatform(targetPlatform) {
  console.log(`⚙️  Bundling JavaScript for ${targetPlatform}...`);
  const bundlePath = path.join(distDir, `index.${targetPlatform}.bundle`);
  const assetsDest = path.join(distDir, `assets_${targetPlatform}`);

  fs.mkdirSync(assetsDest, { recursive: true });

  const cmd = `npx react-native bundle \
    --platform ${targetPlatform} \
    --dev false \
    --entry-file index.js \
    --bundle-output "${bundlePath}" \
    --assets-dest "${assetsDest}"`;

  execSync(cmd, { stdio: 'inherit', cwd: rootDir });
  console.log(`✅ ${targetPlatform} bundle generated at: ${bundlePath}\n`);
}

if (platform === 'android' || platform === 'all') {
  bundlePlatform('android');
}

if (platform === 'ios' || platform === 'all') {
  bundlePlatform('ios');
}

// Generate OTA manifest.json
const manifest = {
  version,
  changelog,
  releasedAt: new Date().toISOString(),
  mandatory: false,
  android: {
    bundleFile: 'index.android.bundle',
    bundleUrl: `https://raw.githubusercontent.com/arjun-jatav/BotDetectApp/main/dist/ota/index.android.bundle`,
  },
  ios: {
    bundleFile: 'index.ios.bundle',
    bundleUrl: `https://raw.githubusercontent.com/arjun-jatav/BotDetectApp/main/dist/ota/index.ios.bundle`,
  },
};

const manifestPath = path.join(distDir, 'ota-manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log(`📄 OTA Manifest generated at: ${manifestPath}`);
console.log('\n==============================================');
console.log('🎉 OTA Release Package Ready in dist/ota/');
console.log('💡 Upload the contents of dist/ota/ to your web server:');
console.log('   https://v2.checkprojectstatus.com/api/ota-manifest');
console.log('==============================================');
