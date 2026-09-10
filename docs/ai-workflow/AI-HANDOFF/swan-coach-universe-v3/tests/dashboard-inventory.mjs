/** SCU dashboard inventory. Static route/import evidence, never runtime proof.
 * Reads source only, no app boot or environment. Writes packet/evidence/astra-dashboard-inventory.json.
 * Dynamic dispatch and conditional visibility require explicit manual/browser verification.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const root = fileURLToPath(new URL('../../../../../', import.meta.url));
const packet = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(path.join(root, 'frontend/package.json'));
const ts = require('typescript');
const rel = (p) => path.relative(root, p).split(path.sep).join('/');
const cache = new Map();
function source(p) {
  if (!cache.has(p)) cache.set(p, ts.createSourceFile(p, fs.readFileSync(p, 'utf8'), ts.ScriptTarget.Latest, true));
  return cache.get(p);
}
function walk(node, callback) { callback(node); ts.forEachChild(node, (n) => walk(n, callback)); }
const line = (node, sf) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
function resolve(from, name) {
  if (!name.startsWith('.')) return null;
  const base = path.resolve(path.dirname(from), name);
  return ['', '.tsx', '.ts', '.mjs', '.js', '/index.tsx', '/index.ts', '/index.mjs']
    .map((suffix) => base + suffix).find((p) => fs.existsSync(p) && fs.statSync(p).isFile()) || null;
}
function bindings(p) {
  const result = new Map(), sf = source(p);
  for (const node of sf.statements) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const target = resolve(p, node.moduleSpecifier.text);
      if (!target) continue;
      const clause = node.importClause;
      if (clause?.name) result.set(clause.name.text, { file: target, line: line(node, sf) });
      if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings))
        for (const el of clause.namedBindings.elements) result.set(el.name.text, { file: target, line: line(node, sf) });
    }
  }
  walk(sf, (node) => {
    if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) || !node.initializer) return;
    const dynamic = [];
    walk(node.initializer, (part) => {
      if (ts.isCallExpression(part) && part.expression.kind === ts.SyntaxKind.ImportKeyword &&
          part.arguments[0] && ts.isStringLiteral(part.arguments[0])) {
        const target = resolve(p, part.arguments[0].text);
        if (target) dynamic.push(target);
      }
    });
    if (dynamic.length === 1) result.set(node.name.text, { file: dynamic[0], line: line(node, sf) });
    else if (node.name.text[0] === node.name.text[0].toUpperCase())
      result.set(node.name.text, { file: p, line: line(node, sf), wrapper: true });
  });
  return result;
}
const routeFile = path.join(root, 'frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx');
const componentFile = path.join(root, 'frontend/src/components/DashBoard/UniversalDashboardLayout.routeComponents.tsx');
const componentBindings = bindings(componentFile);
const textValue = (n) => n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) ? n.text : n?.getText() || '';
const property = (obj, key) => obj.properties?.find((p) => p.name?.getText().replace(/['"]/g, '') === key)?.initializer;
const routes = [];
walk(source(routeFile), (node) => {
  if (!ts.isPropertyAssignment(node) || !['admin', 'trainer', 'client'].includes(node.name.getText())) return;
  const arr = property(node.initializer, 'routes');
  if (!arr || !ts.isArrayLiteralExpression(arr)) return;
  for (const obj of arr.elements) {
    const component = textValue(property(obj, 'component')), binding = componentBindings.get(component);
    routes.push({
      role: node.name.getText(), path: '/dashboard/' + node.name.getText() + textValue(property(obj, 'path')),
      title: textValue(property(obj, 'title')), component, declaration: rel(routeFile) + ':' + line(obj, source(routeFile)),
      entry: binding ? rel(binding.file) : null, binding: binding ? rel(componentFile) + ':' + binding.line : null,
      classification: /Redirect/.test(component) ? 'active_redirect' : binding?.wrapper ? 'active_wrapper' : 'role_configured_mount',
    });
  }
});
const userFile = path.join(root, 'frontend/src/components/UserDashboard/components/UserDashboardTabsV3.tsx');
const userBindings = bindings(userFile), userSource = source(userFile);
walk(userSource, (node) => {
  if (!ts.isJsxElement(node) || node.openingElement.tagName.getText() !== 'TabPanel') return;
  const id = node.openingElement.attributes.properties.find((p) => p.name?.getText() === 'id');
  if (!id?.initializer || !ts.isStringLiteral(id.initializer)) return;
  const children = [];
  walk(node, (child) => {
    const tag = ts.isJsxOpeningElement(child) || ts.isJsxSelfClosingElement(child) ? child.tagName.getText() : null;
    if (tag && userBindings.has(tag)) children.push({ component: tag, ...userBindings.get(tag) });
  });
  routes.push({
    role: 'user', path: id.initializer.text === 'home' ? '/user-dashboard' : '/user-dashboard/' + id.initializer.text,
    title: id.initializer.text, component: children.map((c) => c.component).join(' + '),
    declaration: rel(userFile) + ':' + line(node, userSource),
    entry: children[0] ? rel(children[0].file) : rel(userFile),
    extraEntries: [...new Set(children.map((c) => rel(c.file)))], classification: 'conditional_tab_panel',
  });
});
function inspectTree(entries) {
  const queue = entries.map((file) => ({ file: path.join(root, file), depth: 0 }));
  const visited = new Set(), endpoints = [], tabCandidates = [], coachConsumers = [];
  while (queue.length && visited.size < 100) {
    const { file, depth } = queue.shift();
    if (visited.has(file) || !fs.existsSync(file) || !/\.(tsx?|m?js)$/.test(file)) continue;
    visited.add(file);
    const sf = source(file);
    walk(sf, (node) => {
      if (ts.isCallExpression(node) && /(?:api|axios|fetch|http|service)/i.test(node.expression.getText())) {
        for (const arg of node.arguments.slice(0, 1)) {
          const val = arg.getText();
          if (/['"`][\/]?(?:api[\/]|[a-z-]+[\/])/.test(val))
            endpoints.push({ source: rel(file), line: line(node, sf), call: node.expression.getText(), literal: val.slice(0, 240) });
        }
      }
      if (ts.isObjectLiteralExpression(node)) {
        const id = property(node, 'id') || property(node, 'key');
        const label = property(node, 'label') || property(node, 'title');
        if (id && label && (ts.isStringLiteral(id) || ts.isStringLiteral(label)))
          tabCandidates.push({ source: rel(file), line: line(node, sf), id: textValue(id), label: textValue(label) });
      }
      if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) &&
          /Coach|AITerminal/.test(node.tagName.getText()))
        coachConsumers.push({ source: rel(file), line: line(node, sf), component: node.tagName.getText() });
      if (depth >= 4) return;
      let name = null;
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) name = node.moduleSpecifier.text;
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword &&
          node.arguments[0] && ts.isStringLiteral(node.arguments[0])) name = node.arguments[0].text;
      if (!name || /styles|tokens|AuthContext|ThemeContext|api\.service|apiService|\.test/.test(name)) return;
      const next = resolve(file, name);
      if (next) queue.push({ file: next, depth: depth + 1 });
    });
  }
  return { filesInspected: [...visited].map(rel), traversalTruncated: queue.length > 0,
    endpointCandidates: endpoints, nestedTabCandidates: tabCandidates, coachJsxCandidates: coachConsumers };
}
for (const route of routes) {
  // A wrapper/barrel imports many unrelated pages. Never attribute their APIs
  // to this route simply because they share a module.
  route.staticEvidence = route.classification === 'active_redirect' || route.classification === 'active_wrapper'
    ? { filesInspected: [route.entry], traversalTruncated: false, endpointCandidates: [],
      nestedTabCandidates: [], coachJsxCandidates: [], manualWrapperWalkRequired: true }
    : inspectTree([...new Set([route.entry, ...(route.extraEntries || [])].filter(Boolean))]);
}
const counts = Object.fromEntries(['admin', 'trainer', 'client', 'user'].map((role) => [role, routes.filter((r) => r.role === role).length]));
const report = { schemaVersion: 1, scope: 'static source inventory; backend ownership/browser verification still required',
  routeMount: 'UniversalDashboardLayout.shell.tsx:133 -> shellPieces.tsx:94-108 -> Component',
  userMount: 'main-routes.tsx -> UserDashboard.V3 -> UserDashboardTabsV3 TabPanel',
  limits: { depth: 4, filesPerRoute: 100 }, counts, routes };
const backendFile = path.join(root, 'backend/core/routes.mjs');
report.backendMounts = [];
walk(source(backendFile), (node) => {
  if (ts.isCallExpression(node) && node.expression.getText() === 'app.use' && node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])) report.backendMounts.push({
    prefix: node.arguments[0].text, middleware: node.arguments.slice(1).map((arg) => arg.getText()),
    source: rel(backendFile), line: line(node, source(backendFile)),
  });
});
report.registryCommands = [];
const registryDir = path.join(root, 'backend/services/ai/commandRegistry');
for (const filename of fs.readdirSync(registryDir).filter((name) => name.endsWith('.mjs'))) {
  const file = path.join(registryDir, filename), sf = source(file);
  walk(sf, (node) => {
    if (!ts.isObjectLiteralExpression(node)) return;
    const type = property(node, 'type');
    if (!type || !ts.isStringLiteral(type) || !property(node, 'requiresClientRef')) return;
    report.registryCommands.push({ key: type.text, source: rel(file), line: line(node, sf),
      requiresClientRef: textValue(property(node, 'requiresClientRef')),
      allowedRoles: textValue(property(node, 'roleRequired')), description: textValue(property(node, 'description')),
    });
  });
}
const out = path.join(packet, 'evidence/astra-dashboard-inventory.json');
fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
process.stdout.write(JSON.stringify({ counts, total: routes.length, filesParsed: cache.size,
  truncatedRoutes: routes.filter((r) => r.staticEvidence.traversalTruncated).map((r) => r.path), output: rel(out) }, null, 2));
