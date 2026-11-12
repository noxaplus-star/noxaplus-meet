import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
const icon = await readFile(`${root}public/icons/icon.svg`, 'utf8');
for (const [name, size] of [['favicon-32', 32], ['apple-touch-icon', 180], ['icon-192', 192], ['icon-512', 512]]) {
  await sharp(Buffer.from(icon)).resize(size, size).png().toFile(`${root}public/icons/${name}.png`);
}
const inner = icon.replace(/<svg[^>]*>/, '').replace('</svg>', '');
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#172137"/><g transform="translate(76.8 76.8) scale(.7)">${inner}</g></svg>`;
await sharp(Buffer.from(maskable)).png().toFile(`${root}public/icons/maskable-512.png`);

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#f4f2ec"/><circle cx="1140" cy="20" r="270" fill="#2a9d8f" opacity=".08"/><circle cx="0" cy="630" r="250" fill="#e4572e" opacity=".07"/>
<g transform="translate(76 60) scale(.19)">${inner}</g>
<g font-family="Segoe UI,Arial,sans-serif" fill="#1c2440"><text x="200" y="103" font-size="24" font-weight="700">NoxaPlus</text><text x="200" y="143" font-size="32" font-weight="800">Meet</text>
<text x="80" y="295" font-size="65" font-weight="800">Your meeting,</text><text x="80" y="371" font-size="65" font-weight="800">made actionable.</text><text x="82" y="425" font-size="22" fill="#71768a">Persian minutes. Local rules. Clear next steps.</text>
<rect x="80" y="475" width="180" height="43" rx="21" fill="#e7f3ef"/><text x="103" y="503" font-size="17" font-weight="600" fill="#1d8176">100% local</text><rect x="277" y="475" width="220" height="43" rx="21" fill="#fbede5"/><text x="300" y="503" font-size="17" font-weight="600" fill="#c94b26">No accounts. No keys.</text>
<rect x="740" y="120" width="380" height="382" rx="24" fill="#fffdf9" stroke="#e6e3da"/><text x="777" y="172" font-size="14" font-weight="700" fill="#1d8176">MEETING MINUTES</text><text x="777" y="216" font-size="26" font-weight="700">Decisions to action</text><path d="M778 246h297" stroke="#e6e3da"/>
<circle cx="790" cy="286" r="10" fill="#2a9d8f"/><path d="m786 286 3 3 5-6" fill="none" stroke="white" stroke-width="2"/><text x="813" y="292" font-size="17">Release approved</text><rect x="777" y="315" width="300" height="60" rx="10" fill="#f4f2ec"/><text x="795" y="339" font-size="15">Prepare release notes</text><text x="795" y="359" font-size="12" fill="#71768a">Owner assigned · deadline resolved</text><rect x="777" y="389" width="300" height="60" rx="10" fill="#f4f2ec"/><text x="795" y="413" font-size="15">Review the risk register</text><text x="795" y="433" font-size="12" fill="#71768a">Source-linked · ready for review</text>
<text x="80" y="592" font-size="16" fill="#71768a">github.com/noxaplus-star/noxaplus-meet · noxaplus.ir</text></g></svg>`;
await sharp(Buffer.from(og)).png().toFile(`${root}public/og.png`);
console.log('NoxaPlus Meet icons and social image generated.');
