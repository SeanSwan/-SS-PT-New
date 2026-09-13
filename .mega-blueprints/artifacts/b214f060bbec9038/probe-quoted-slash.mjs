import { collectImportStatements, importsFile } from './lib-imports.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..', '..');
const target = path.join(root, 'backend', 'routes', 'bootcampRoutes.mjs');
const mounter = path.join(root, 'backend', 'core', 'routes.mjs');
const cases = [
  ["const s = '/*';", "import x from '../routes/bootcampRoutes.mjs';"],
  ['const s = "a /* b";', "import x from '../routes/bootcampRoutes.mjs';"],
  ["const t = `/*`;", "import x from '../routes/bootcampRoutes.mjs';"],
  ["const u = 'unterminated", "import x from '../routes/bootcampRoutes.mjs';"],
];
for (const [head, imp] of cases) {
  const src = `${head}\n${imp}\n`;
  const stmts = collectImportStatements(src);
  console.log(`${JSON.stringify(head).padEnd(34)} stmts=${stmts.length} importsFile=${importsFile(mounter, target, src)}`);
}