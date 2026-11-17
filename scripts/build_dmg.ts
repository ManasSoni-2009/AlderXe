import fs from 'fs';
import path from 'path';
import { DEFAULT_DRIVER_CONFIG } from '../lib/driver-engine';
import { buildCompleteDmgPackage } from '../lib/dmg-packager';

console.log('[1/3] Generating XeControl DMG package...');
const pkg = buildCompleteDmgPackage(DEFAULT_DRIVER_CONFIG, 'hybrid_mux');
console.log(`[2/3] Package generated: ${pkg.dmgFilename}`);
console.log(`      Total size: ${pkg.totalSizeBytes} bytes (${(pkg.totalSizeBytes / 1024 / 1024).toFixed(2)} MB)`);
console.log(`      SHA256: ${pkg.sha256Digest}`);
console.log(`      Validation valid: ${pkg.validation.valid}`);

const outDir = path.resolve(__dirname, '..');
const dmgPath1 = path.join(outDir, pkg.dmgFilename);
const dmgPath2 = path.join(outDir, 'XeControl.dmg');

fs.writeFileSync(dmgPath1, Buffer.from(pkg.binaryBytes));
fs.writeFileSync(dmgPath2, Buffer.from(pkg.binaryBytes));
console.log(`[3/3] Successfully wrote ${dmgPath1} and ${dmgPath2}!`);
