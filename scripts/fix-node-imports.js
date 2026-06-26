#!/usr/bin/env node
/**
 * Post-package script: make `dist/` valid Node ESM.
 *
 * `svelte-package` emits extensionless relative imports (e.g. `from './envs'`),
 * which Vite/SvelteKit tolerate but Node's ESM resolver rejects. This rewrites
 * every relative import/export in dist `.js` and `.d.ts` files to carry an
 * explicit extension:
 *
 *   from './envs'              -> from './envs.js'
 *   from './components/types'  -> from './components/types.js'   (file)
 *   from './components'        -> from './components/index.js'   (directory)
 *
 * `.svelte`, `.es.js`, `.json` and already-extensioned specifiers are left
 * untouched. Adding explicit `.js` extensions is also valid for the Vite/Svelte
 * consumer, so both entry points keep working.
 *
 * Runs after `inline-contracts.js` (which handles `.es` -> `.es.js`).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'dist');

const IMPORT_RE = /(from\s+|import\s+|export\s+(?:\*|\{[^}]*\})\s+from\s+)(['"])(\.\.?\/[^'"]+)\2/g;

function hasKnownExtension(spec) {
    return /\.(js|mjs|cjs|json|svelte|css|es)$/.test(spec) || /\.es\.js$/.test(spec);
}

function resolveSpecifier(fromFile, spec) {
    if (hasKnownExtension(spec)) return spec;
    const baseDir = path.dirname(fromFile);
    const target = path.resolve(baseDir, spec);
    // Prefer a sibling file `<spec>.js`; fall back to `<spec>/index.js`.
    if (fs.existsSync(`${target}.js`)) return `${spec}.js`;
    if (fs.existsSync(path.join(target, 'index.js'))) {
        return spec.endsWith('/') ? `${spec}index.js` : `${spec}/index.js`;
    }
    // Unknown — leave as-is rather than emit a broken path.
    return spec;
}

let fileCount = 0;
let rewriteCount = 0;

function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(full);
        } else if (entry.name.endsWith('.js') || entry.name.endsWith('.d.ts')) {
            const content = fs.readFileSync(full, 'utf-8');
            const updated = content.replace(IMPORT_RE, (match, head, quote, spec) => {
                const fixed = resolveSpecifier(full, spec);
                if (fixed !== spec) rewriteCount += 1;
                return `${head}${quote}${fixed}${quote}`;
            });
            if (updated !== content) {
                fs.writeFileSync(full, updated);
                fileCount += 1;
            }
        }
    }
}

walk(distDir);
console.log(`fix-node-imports: rewrote ${rewriteCount} specifiers across ${fileCount} files.`);
