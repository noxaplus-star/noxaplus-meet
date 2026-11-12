// Copies the single-file build to the repository root so index.html opens directly from disk.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
let built = await readFile(`${root}dist/index.html`, 'utf8');
const notices = await Promise.all([
  ['NoxaPlus Meet', 'LICENSE'],
  ['React', 'node_modules/react/LICENSE'],
  ['React DOM', 'node_modules/react-dom/LICENSE'],
  ['Vazirmatn', 'node_modules/@fontsource-variable/vazirmatn/LICENSE'],
].map(async ([name, file]) => `${name}\n${await readFile(`${root}${file}`, 'utf8')}`));
const licenseText = notices.join('\n\n');
const bodyEnd = built.lastIndexOf('</body>');
built = `${built.slice(0, bodyEnd)}<script type="text/plain" id="third-party-licenses">${licenseText}</script>${built.slice(bodyEnd)}`;
await writeFile(`${root}dist/index.html`, built);
await writeFile(`${root}dist/THIRD-PARTY-LICENSES.txt`, licenseText);

if (/<script[^>]+src="\.\/assets\//.test(built) || /<link[^>]+href="\.\/assets\//.test(built)) {
  throw new Error('dist/index.html still references external bundles; the inline step did not run.');
}

const standalone = built
  .replace(/\s*<link rel="manifest"[^>]*>/, '')
  .replace(/(href|content)="\.\/icons\//g, '$1="./public/icons/');

await writeFile(`${root}index.html`, standalone);
console.log(`Standalone index.html written (${(standalone.length / 1024).toFixed(0)} KB).`);
