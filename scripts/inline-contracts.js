#!/usr/bin/env node
/**
 * Post-package script: converts .es contract files in dist/ to .js modules
 * so consuming apps don't need special Vite config to import them.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'dist');
const contractsDir = path.join(distDir, 'contracts');

// Find all .es files in dist/contracts and convert to .js
const esFiles = fs.readdirSync(contractsDir).filter(f => f.endsWith('.es'));

for (const esFile of esFiles) {
  const esPath = path.join(contractsDir, esFile);
  const jsFile = esFile.replace('.es', '.es.js');
  const jsPath = path.join(contractsDir, jsFile);

  const content = fs.readFileSync(esPath, 'utf-8');
  fs.writeFileSync(jsPath, `export default ${JSON.stringify(content)};\n`);
  fs.unlinkSync(esPath); // remove the raw .es file
  console.log(`  ${esFile} -> ${jsFile}`);
}

// Update all .js and .d.ts files in dist that import .es files
function fixImports(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      fixImports(fullPath);
    } else if (entry.name.endsWith('.js') || entry.name.endsWith('.d.ts')) {
      let content = fs.readFileSync(fullPath, 'utf-8');
      const updated = content.replace(/from\s+['"]([^'"]*?)\.es['"]/g, "from '$1.es.js'");
      if (updated !== content) {
        fs.writeFileSync(fullPath, updated);
        console.log(`  Fixed imports in ${path.relative(distDir, fullPath)}`);
      }
    }
  }
}

fixImports(distDir);
console.log('Done: contracts inlined as JS modules.');
