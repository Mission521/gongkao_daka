const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
let type = args[0]; // 'major', 'minor', 'patch', or specific version

// Default to 'patch' if not specified
if (!type) {
  console.log('No version type specified, defaulting to "patch"');
  type = 'patch';
}

const packageJsonPath = path.resolve(__dirname, '../package.json');
const versionTsPath = path.resolve(__dirname, '../src/config/version.ts');

const packageJson = require(packageJsonPath);
const currentVersion = packageJson.version;
const parts = currentVersion.split('.').map(Number);

let newVersion;

if (['major', 'minor', 'patch'].includes(type)) {
  if (type === 'major') {
    parts[0]++;
    parts[1] = 0;
    parts[2] = 0;
  } else if (type === 'minor') {
    parts[1]++;
    parts[2] = 0;
  } else if (type === 'patch') {
    parts[2]++;
  }
  newVersion = parts.join('.');
} else {
  // Assume explicit version if valid semver
  if (/^\d+\.\d+\.\d+$/.test(type)) {
    newVersion = type;
  } else {
    console.error('Invalid version type or format. Use major, minor, patch, or x.y.z');
    process.exit(1);
  }
}

console.log(`Bumping version: ${currentVersion} -> ${newVersion}`);

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
console.log('Updated package.json');

// Update src/config/version.ts
const versionTsContent = `export const APP_VERSION = '${newVersion}'\n`;
fs.writeFileSync(versionTsPath, versionTsContent);
console.log('Updated src/config/version.ts');

try {
  console.log('Committing changes...');
  // Add modified files
  execSync(`git add "${packageJsonPath}" "${versionTsPath}"`);
  
  // Commit
  execSync(`git commit -m "chore: bump version to ${newVersion}"`);
  
  // Create tag
  execSync(`git tag v${newVersion}`);
  
  console.log(`Successfully committed and tagged v${newVersion}`);
} catch (error) {
  console.error('Failed to commit git changes:', error.message);
  // Don't exit with error, as file updates were successful
}

console.log(`\nVersion updated to ${newVersion} successfully!`);
