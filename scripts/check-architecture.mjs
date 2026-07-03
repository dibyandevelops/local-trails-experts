import { readFileSync, readdirSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const root = resolve(process.cwd());
const reportOnly = process.argv.includes('--report');
const sourceExtensions = new Set(['.ts', '.tsx']);

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function extension(path) {
  const match = path.match(/\.[^.]+$/);
  return match?.[0] || '';
}

const files = walk(resolve(root, 'src'))
  .filter((path) => sourceExtensions.has(extension(path)))
  .map((path) => ({ path, name: relative(root, path).replaceAll('\\', '/'), source: readFileSync(path, 'utf8') }));

const uiRoots = ['src/components/', 'src/hooks/', 'src/stores/', 'src/i18n/'];
const routeUi = (name) => name.startsWith('src/app/') && !name.startsWith('src/app/api/');
const isUi = (name) => routeUi(name) || uiRoots.some((prefix) => name.startsWith(prefix));
const violations = [];

const sqlPattern = /\b(SELECT\s+[\s\S]{1,500}?\s+FROM|INSERT\s+INTO|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE)\b/;
const databaseImportPattern = /from\s+['"](?:pg|@\/lib\/db|@\/lib\/database)['"]/;
const uiImportPattern = /from\s+['"]@\/(?:components|hooks|stores)\//;
const upperLayerImportPattern = /from\s+['"]@\/(?:app|components|hooks|stores)\//;

for (const file of files) {
  if (isUi(file.name) && (sqlPattern.test(file.source) || databaseImportPattern.test(file.source))) {
    violations.push(`${file.name}: UI/application layer contains database access`);
  }

  if (file.name.startsWith('src/app/api/') && uiImportPattern.test(file.source)) {
    violations.push(`${file.name}: API layer imports UI/application code`);
  }

  if (file.name.startsWith('src/services/') && upperLayerImportPattern.test(file.source)) {
    violations.push(`${file.name}: service layer imports an upper layer`);
  }
}

if (reportOnly) {
  const directHttp = files
    .filter((file) => isUi(file.name) && /\bfetch\s*\(/.test(file.source))
    .map((file) => file.name)
    .sort();

  console.log(`Direct client HTTP migration candidates: ${directHttp.length}`);
  for (const file of directHttp) console.log(`- ${file}`);
}

if (violations.length > 0) {
  console.error(`Architecture violations: ${violations.length}`);
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log('Architecture boundaries passed.');
}
