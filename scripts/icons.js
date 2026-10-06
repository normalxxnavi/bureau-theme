// @ts-check
'use strict';

/**
 * Genera el tema de iconos de archivo «Bureau Icons» en icons/.
 *
 *   npm run icons
 *
 * Diseño: cada archivo lleva una ETIQUETA (TS, C#, {}…) o un pictograma y,
 * debajo, la «franja de clasificación» de un expediente del Bureau, con una
 * muesca en luz astral. Las carpetas son bloques de hormigón con una pestaña de
 * color; la carpeta raíz es la pirámide invertida del Consejo (Plano Astral).
 * Guiños de lore: los .env salen como un documento clasificado (tachado) y los
 * tests llevan el hexágono de la Hedron.
 *
 * Se generan dos variantes de cada icono: para temas oscuros y para temas
 * claros (CONTROL Astral). Todo es original: no se usan logos de terceros.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'icons');
const SVG_DIR = path.join(OUT, 'svg');

/** Colores [tema oscuro, tema claro]. */
const C = {
  red: ['#E5675D', '#B3261E'],
  amber: ['#E6B04F', '#8A6100'],
  paper: ['#CDB68C', '#7A5A16'],
  steel: ['#79A9D1', '#1F5F99'],
  ice: ['#9CC2E6', '#2867A4'],
  cyan: ['#6FCFDC', '#1D6F73'],
  teal: ['#8FC1BE', '#2A6B66'],
  green: ['#86B57E', '#2A7334'],
  violet: ['#B79AE0', '#6A4A9E'],
  rose: ['#DDA9C8', '#8E3A7A'],
  orange: ['#E6904F', '#A84C0E'],
  bone: ['#D9D6CF', '#3A3936'],
  concrete: ['#8E8B85', '#5F5D57'],
  dim: ['#6E6C68', '#97948B'],
};
/** @typedef {keyof typeof C} ColorName */

const NOTCH = ['#F2EFE8', '#1A1A1C'];
const FOLDER = { body: ['#2E2F33', '#DAD8D1'], stroke: ['#5E5C59', '#8E8B85'], open: ['#3A3B40', '#E6E4DE'] };
const BOARD = { fill: ['#0D0E0F', '#151517'], stroke: ['#F2EFE8', '#151517'], line: ['#E0352B', '#C8261C'] };
const FONT = "font-family='Segoe UI, -apple-system, Helvetica Neue, Arial, sans-serif' font-weight='700' text-anchor='middle'";

const esc = (/** @type {string} */ s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const svg = (/** @type {string} */ body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">${body}</svg>\n`;

/** Franja de clasificación con la muesca de luz astral. */
const band = (/** @type {string} */ color, /** @type {number} */ v) =>
  `<rect x="2" y="13.2" width="12" height="1.6" fill="${color}" fill-opacity=".85"/><rect x="2" y="13.2" width="2.6" height="1.6" fill="${NOTCH[v]}"/>`;

/** Icono de etiqueta de texto. */
function label(/** @type {string} */ text, /** @type {string} */ color, /** @type {number} */ v) {
  const n = [...text].length;
  const size = n === 1 ? 10.5 : n === 2 ? 8.4 : 6.2;
  const y = n === 1 ? 11 : n === 2 ? 10.6 : 9.8;
  return svg(`<text x="8" y="${y}" font-size="${size}" ${FONT} letter-spacing="-.3" fill="${color}">${esc(text)}</text>${band(color, v)}`);
}

const S = (/** @type {string} */ c, w = 1.3) => `fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;

/** Pictogramas (zona útil y = 1.5…11.5). */
const PICTO = {
  image: (/** @type {string} */ c) => `<rect x="2.5" y="2.2" width="11" height="9" rx="1" ${S(c)}/><path d="M3.6 10.2 6.6 6.6 8.6 8.6 10.1 7.1 12.4 10.2" ${S(c)}/><circle cx="11" cy="4.8" r="1" fill="${c}"/>`,
  audio: (/** @type {string} */ c) =>
    [2.6, 6.4, 9, 6, 3.2]
      .map((h, i) => `<rect x="${2.6 + i * 2.4}" y="${6.8 - h / 2}" width="1.4" height="${h}" rx=".7" fill="${c}"/>`)
      .join(''),
  database: (/** @type {string} */ c) => `<ellipse cx="8" cy="3.5" rx="5" ry="1.7" ${S(c)}/><path d="M3 3.5v6.6c0 .9 2.2 1.7 5 1.7s5-.8 5-1.7V3.5M3 6.8c0 .9 2.2 1.7 5 1.7s5-.8 5-1.7" ${S(c)}/>`,
  lock: (/** @type {string} */ c) => `<rect x="3.8" y="6.2" width="8.4" height="5.6" rx="1" fill="${c}"/><path d="M5.5 6.2V4.6a2.5 2.5 0 0 1 5 0v1.6" ${S(c)}/>`,
  git: (/** @type {string} */ c) => `<circle cx="5" cy="3.2" r="1.4" ${S(c)}/><circle cx="5" cy="10.4" r="1.4" ${S(c)}/><circle cx="11.2" cy="5.2" r="1.4" ${S(c)}/><path d="M5 4.6V9M11.2 6.6c0 2.2-3.4 1.8-5.6 2.9" ${S(c)}/>`,
  sliders: (/** @type {string} */ c) =>
    `<path d="M2.6 3.6h10.8M2.6 7h10.8M2.6 10.4h10.8" ${S(c)} stroke-opacity=".55"/><circle cx="10.2" cy="3.6" r="1.5" fill="${c}"/><circle cx="5.2" cy="7" r="1.5" fill="${c}"/><circle cx="8.6" cy="10.4" r="1.5" fill="${c}"/>`,
  archive: (/** @type {string} */ c) => `<rect x="2.5" y="2.6" width="11" height="9" rx="1" ${S(c)}/><path d="M2.5 5.4h11" ${S(c)}/><rect x="7" y="5.4" width="2" height="2.2" fill="${c}"/>`,
  lines: (/** @type {string} */ c) => `<path d="M2.8 3h10.4M2.8 5.8h8M2.8 8.6h10.4M2.8 11.2h6" ${S(c)}/>`,
  seal: (/** @type {string} */ c) => `<circle cx="8" cy="5.6" r="3.6" ${S(c)}/><circle cx="8" cy="5.6" r="1.3" fill="${c}"/><path d="M5.9 8.6 5.1 12l1.9-.9 1 1.2M10.1 8.6l.8 3.4-1.9-.9" ${S(c)}/>`,
  classified: (/** @type {string} */ c) =>
    `<rect x="2.5" y="2.2" width="7.5" height="1.9" fill="${c}"/><rect x="4.6" y="5.6" width="8.9" height="1.9" fill="${c}"/><rect x="2.5" y="9" width="9" height="1.9" fill="${c}"/><path d="M11.4 3.15h2.1M2.5 6.55h1" ${S(c, 0.9)} stroke-opacity=".6"/>`,
  hedronCheck: (/** @type {string} */ c) => `<path d="M8 1.6 12.5 4.2v5.2L8 12 3.5 9.4V4.2Z" ${S(c)}/><path d="M5.8 6.9 7.3 8.4l3-3" ${S(c)}/>`,
  diff: (/** @type {string} */ c) => `<path d="M4.6 2.4v5M2.1 4.9h5M8.9 9.6h5" ${S(c)}/>`,
  grid: (/** @type {string} */ c) => `<rect x="2.5" y="2.4" width="11" height="9" rx=".8" ${S(c)}/><path d="M2.5 5.4h11M2.5 8.4h11M6.2 2.4v9M9.8 2.4v9" ${S(c, 0.9)}/>`,
  info: (/** @type {string} */ c) => `<circle cx="8" cy="6.6" r="5" ${S(c)}/><circle cx="8" cy="4.4" r=".9" fill="${c}"/><path d="M8 6.4v3" ${S(c)}/>`,
  list: (/** @type {string} */ c) => `<circle cx="3.4" cy="3.4" r=".9" fill="${c}"/><circle cx="3.4" cy="6.8" r=".9" fill="${c}"/><circle cx="3.4" cy="10.2" r=".9" fill="${c}"/><path d="M5.8 3.4h7.4M5.8 6.8h7.4M5.8 10.2h5" ${S(c)}/>`,
  cube: (/** @type {string} */ c) => `<path d="M8 1.6 13.4 4.3v5.6L8 12.6 2.6 9.9V4.3Z" ${S(c)}/><path d="M2.6 4.3 8 7l5.4-2.7M8 7v5.6" ${S(c)}/>`,
  play: (/** @type {string} */ c) => `<rect x="2.5" y="2.4" width="11" height="9" rx="1" ${S(c)}/><path d="M6.6 4.6v4.6l3.8-2.3Z" fill="${c}"/>`,
  file: (/** @type {string} */ c) => `<path d="M3.5 1.8h6l3 3v7h-9z" ${S(c)} stroke-opacity=".8"/><path d="M9.5 1.8v3h3" ${S(c)} stroke-opacity=".8"/>`,
};
/** @typedef {keyof typeof PICTO} PictoName */

function picto(/** @type {PictoName} */ name, /** @type {string} */ color, /** @type {number} */ v) {
  return svg(`${PICTO[name](color)}${band(color, v)}`);
}

/** Carpeta: bloque de hormigón con pestaña de color (y cuerpo teñido). */
function folder(/** @type {string | null} */ tab, /** @type {boolean} */ open, /** @type {number} */ v) {
  const body = FOLDER.body[v];
  const stroke = FOLDER.stroke[v];
  const tabColor = tab ?? FOLDER.stroke[v];
  const back = `<path d="M1.5 3.5h4.7L7.6 5h6.9v8H1.5z" fill="${body}" stroke="${stroke}"/>`;
  const tabRect = `<path d="M1.5 3.5h4.7L7.6 5H1.5z" fill="${tabColor}"/><rect x="1.5" y="3.5" width="5.2" height="2.2" fill="${tabColor}"/>`;
  if (!open) return svg(`${back}${tabRect}${tab ? `<rect x="2" y="6.2" width="12" height="6.3" fill="${tab}" fill-opacity=".22"/><path d="M2 12.5h12" stroke="${tab}" stroke-width="1"/>` : ''}`);
  const front = `<path d="M1.5 13 3.3 7.6h11.3L12.8 13z" fill="${FOLDER.open[v]}" stroke="${stroke}"/>`;
  return svg(`${back}${tabRect}${front}${tab ? `<path d="M3.4 8.4h10.6M2.3 12.5h10.2" stroke="${tab}" stroke-width="1.2"/>` : ''}`);
}

/** Carpeta raíz: la pirámide invertida del Consejo, flotando en el Plano Astral. */
function board(/** @type {boolean} */ open, /** @type {number} */ v) {
  const tri = `<path d="M1.8 2.6h12.4L8 13.6z" fill="${BOARD.fill[v]}" stroke="${BOARD.stroke[v]}" stroke-linejoin="round"/>`;
  const line = `<path d="M3.6 4.4h8.8" stroke="${BOARD.line[v]}" stroke-width="1.2"/>`;
  const glow = open ? `<path d="M6 6.8h4L8 10.4z" fill="${BOARD.stroke[v]}" fill-opacity=".85"/>` : '';
  return svg(`${tri}${line}${glow}`);
}

// --- Catálogo ---------------------------------------------------------------

/** @type {Record<string, ['label', string, ColorName] | ['picto', PictoName, ColorName]>} */
const FILES = {
  file: ['picto', 'file', 'concrete'],
  ts: ['label', 'TS', 'steel'],
  dts: ['label', 'TS', 'concrete'],
  tsx: ['label', 'TX', 'steel'],
  js: ['label', 'JS', 'amber'],
  jsx: ['label', 'JX', 'amber'],
  json: ['label', '{}', 'paper'],
  cs: ['label', 'C#', 'violet'],
  razor: ['label', '@', 'violet'],
  project: ['picto', 'cube', 'violet'],
  html: ['label', '<>', 'red'],
  css: ['label', '#', 'teal'],
  scss: ['label', 'S', 'rose'],
  less: ['label', 'L', 'ice'],
  md: ['label', 'MD', 'bone'],
  py: ['label', 'PY', 'ice'],
  sql: ['picto', 'database', 'amber'],
  xml: ['label', '</>', 'orange'],
  yaml: ['label', 'Y', 'rose'],
  config: ['picto', 'sliders', 'concrete'],
  shell: ['label', '$_', 'green'],
  powershell: ['label', '>_', 'steel'],
  bat: ['label', '>_', 'concrete'],
  text: ['picto', 'lines', 'concrete'],
  log: ['picto', 'lines', 'paper'],
  image: ['picto', 'image', 'green'],
  audio: ['picto', 'audio', 'rose'],
  video: ['picto', 'play', 'rose'],
  pdf: ['label', 'PDF', 'red'],
  archive: ['picto', 'archive', 'concrete'],
  vsix: ['picto', 'archive', 'red'],
  lock: ['picto', 'lock', 'dim'],
  license: ['picto', 'seal', 'amber'],
  readme: ['picto', 'info', 'steel'],
  changelog: ['picto', 'list', 'teal'],
  git: ['picto', 'git', 'orange'],
  env: ['picto', 'classified', 'amber'],
  package: ['picto', 'cube', 'red'],
  test: ['picto', 'hedronCheck', 'cyan'],
  diff: ['picto', 'diff', 'green'],
  csv: ['picto', 'grid', 'green'],
  docker: ['label', 'DK', 'ice'],
  go: ['label', 'GO', 'cyan'],
  rust: ['label', 'RS', 'orange'],
  java: ['label', 'JV', 'red'],
  kotlin: ['label', 'KT', 'violet'],
  c: ['label', 'C', 'steel'],
  cpp: ['label', 'C+', 'steel'],
  header: ['label', 'H', 'violet'],
  php: ['label', 'PH', 'violet'],
  ruby: ['label', 'RB', 'red'],
  vue: ['label', 'V', 'green'],
  svelte: ['label', 'SV', 'orange'],
  dart: ['label', 'DT', 'cyan'],
  lua: ['label', 'LU', 'steel'],
  r: ['label', 'R', 'ice'],
  swift: ['label', 'SW', 'orange'],
  fsharp: ['label', 'F#', 'cyan'],
  vb: ['label', 'VB', 'violet'],
  graphql: ['label', 'GQ', 'rose'],
  font: ['label', 'Aa', 'bone'],
};

const EXTENSIONS = {
  ts: 'ts', mts: 'ts', cts: 'ts', 'd.ts': 'dts', tsx: 'tsx', js: 'js', mjs: 'js', cjs: 'js', jsx: 'jsx',
  json: 'json', jsonc: 'json', json5: 'json', cs: 'cs', csx: 'cs', cshtml: 'razor', razor: 'razor',
  csproj: 'project', sln: 'project', slnx: 'project', fsproj: 'project', vbproj: 'project', props: 'project', targets: 'project',
  html: 'html', htm: 'html', css: 'css', scss: 'scss', sass: 'scss', less: 'less', md: 'md', mdx: 'md', markdown: 'md',
  py: 'py', pyi: 'py', ipynb: 'py', sql: 'sql', db: 'sql', sqlite: 'sql', xml: 'xml', xaml: 'xml', xsd: 'xml', resx: 'xml', plist: 'xml',
  yaml: 'yaml', yml: 'yaml', toml: 'config', ini: 'config', cfg: 'config', conf: 'config', properties: 'config',
  sh: 'shell', bash: 'shell', zsh: 'shell', fish: 'shell', ps1: 'powershell', psm1: 'powershell', psd1: 'powershell', bat: 'bat', cmd: 'bat',
  txt: 'text', log: 'log', png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image', bmp: 'image', ico: 'image', svg: 'image', avif: 'image',
  wav: 'audio', mp3: 'audio', ogg: 'audio', flac: 'audio', m4a: 'audio', aac: 'audio', mp4: 'video', webm: 'video', mov: 'video', mkv: 'video',
  pdf: 'pdf', zip: 'archive', tar: 'archive', gz: 'archive', tgz: 'archive', '7z': 'archive', rar: 'archive', vsix: 'vsix', nupkg: 'archive',
  lock: 'lock', diff: 'diff', patch: 'diff', csv: 'csv', tsv: 'csv', xlsx: 'csv',
  'test.ts': 'test', 'spec.ts': 'test', 'test.js': 'test', 'spec.js': 'test', 'test.tsx': 'test', 'spec.tsx': 'test', 'test.mjs': 'test',
  go: 'go', rs: 'rust', java: 'java', kt: 'kotlin', kts: 'kotlin', c: 'c', cpp: 'cpp', cc: 'cpp', cxx: 'cpp', h: 'header', hpp: 'header',
  php: 'php', rb: 'ruby', vue: 'vue', svelte: 'svelte', dart: 'dart', lua: 'lua', r: 'r', swift: 'swift', fs: 'fsharp', fsx: 'fsharp', vb: 'vb',
  graphql: 'graphql', gql: 'graphql', ttf: 'font', otf: 'font', woff: 'font', woff2: 'font',
};

const FILE_NAMES = {
  'package.json': 'package', 'package-lock.json': 'lock', 'yarn.lock': 'lock', 'pnpm-lock.yaml': 'lock', 'bun.lockb': 'lock', 'packages.lock.json': 'lock',
  license: 'license', 'license.md': 'license', 'license.txt': 'license', copying: 'license',
  'readme.md': 'readme', readme: 'readme', 'readme.txt': 'readme', 'changelog.md': 'changelog', changelog: 'changelog', 'history.md': 'changelog',
  '.gitignore': 'git', '.gitattributes': 'git', '.gitmodules': 'git', '.gitkeep': 'git',
  '.editorconfig': 'config', '.vscodeignore': 'config', '.npmrc': 'config', '.nvmrc': 'config', '.prettierrc': 'config', '.eslintrc': 'config',
  '.eslintrc.json': 'config', '.prettierrc.json': 'config', 'tsconfig.json': 'config', 'jsconfig.json': 'config', 'global.json': 'config', 'nuget.config': 'config',
  '.env': 'env', '.env.local': 'env', '.env.development': 'env', '.env.production': 'env', '.env.example': 'env', '.env.test': 'env',
  dockerfile: 'docker', 'docker-compose.yml': 'docker', 'docker-compose.yaml': 'docker', '.dockerignore': 'docker',
};

const LANGUAGE_IDS = {
  typescript: 'ts', typescriptreact: 'tsx', javascript: 'js', javascriptreact: 'jsx', json: 'json', jsonc: 'json', csharp: 'cs',
  razor: 'razor', aspnetcorerazor: 'razor', html: 'html', css: 'css', scss: 'scss', less: 'less', markdown: 'md', python: 'py',
  sql: 'sql', xml: 'xml', yaml: 'yaml', shellscript: 'shell', powershell: 'powershell', bat: 'bat', plaintext: 'text', log: 'log',
  ignore: 'git', ini: 'config', properties: 'config', dockerfile: 'docker', diff: 'diff', go: 'go', rust: 'rust', java: 'java',
  c: 'c', cpp: 'cpp', php: 'php', ruby: 'ruby', vue: 'vue', dart: 'dart', lua: 'lua', r: 'r', swift: 'swift', fsharp: 'fsharp', vb: 'vb',
  graphql: 'graphql', dotenv: 'env',
};

/** Carpetas especiales → color de la pestaña. */
const FOLDERS = /** @type {Record<string, ColorName>} */ ({
  src: 'red', source: 'red', lib: 'red', app: 'red',
  test: 'cyan', tests: 'cyan', __tests__: 'cyan', spec: 'cyan', 'test-workspace': 'cyan', e2e: 'cyan',
  docs: 'bone', doc: 'bone', documentation: 'bone',
  images: 'green', img: 'green', assets: 'green', icons: 'green', media: 'green', public: 'green', static: 'green', screenshots: 'green',
  scripts: 'amber', tools: 'amber', bin: 'dim', obj: 'dim', dist: 'dim', out: 'dim', build: 'dim', target: 'dim', node_modules: 'dim',
  themes: 'rose', styles: 'rose', css: 'teal', sounds: 'rose', audio: 'rose',
  '.vscode': 'steel', '.github': 'orange', '.git': 'orange', l10n: 'teal', locales: 'teal', i18n: 'teal',
  components: 'steel', config: 'concrete', '.config': 'concrete', references: 'paper', data: 'paper', integration: 'cyan',
});

// --- Generación ---------------------------------------------------------------

function main() {
  fs.rmSync(SVG_DIR, { recursive: true, force: true });
  fs.mkdirSync(SVG_DIR, { recursive: true });

  /** @type {Record<string, {iconPath: string}>} */
  const defs = {};
  const write = (/** @type {string} */ id, /** @type {string} */ content) => {
    fs.writeFileSync(path.join(SVG_DIR, `${id}.svg`), content);
    defs[id] = { iconPath: `./svg/${id}.svg` };
  };

  for (const [v, suffix] of /** @type {const} */ ([[0, ''], [1, '_light']])) {
    for (const [name, [kind, what, color]] of Object.entries(FILES)) {
      const c = C[color][v];
      write(`file_${name}${suffix}`, kind === 'label' ? label(what, c, v) : picto(/** @type {PictoName} */ (what), c, v));
    }
    write(`folder${suffix}`, folder(null, false, v));
    write(`folder_open${suffix}`, folder(null, true, v));
    write(`root${suffix}`, board(false, v));
    write(`root_open${suffix}`, board(true, v));
    for (const color of new Set(Object.values(FOLDERS))) {
      write(`folder_${color}${suffix}`, folder(C[color][v], false, v));
      write(`folder_${color}_open${suffix}`, folder(C[color][v], true, v));
    }
  }

  const mapping = (/** @type {string} */ suffix) => ({
    file: `file_file${suffix}`,
    folder: `folder${suffix}`,
    folderExpanded: `folder_open${suffix}`,
    rootFolder: `root${suffix}`,
    rootFolderExpanded: `root_open${suffix}`,
    fileExtensions: Object.fromEntries(Object.entries(EXTENSIONS).map(([ext, f]) => [ext, `file_${f}${suffix}`])),
    fileNames: Object.fromEntries(Object.entries(FILE_NAMES).map(([n, f]) => [n, `file_${f}${suffix}`])),
    languageIds: Object.fromEntries(Object.entries(LANGUAGE_IDS).map(([l, f]) => [l, `file_${f}${suffix}`])),
    folderNames: Object.fromEntries(Object.entries(FOLDERS).map(([n, c]) => [n, `folder_${c}${suffix}`])),
    folderNamesExpanded: Object.fromEntries(Object.entries(FOLDERS).map(([n, c]) => [n, `folder_${c}_open${suffix}`])),
  });

  const theme = {
    hidesExplorerArrows: false,
    iconDefinitions: defs,
    ...mapping(''),
    light: mapping('_light'),
    highContrast: mapping(''),
  };
  fs.writeFileSync(path.join(OUT, 'bureau-icon-theme.json'), JSON.stringify(theme, null, 2) + '\n');
  console.log(`✔ icons/bureau-icon-theme.json (${Object.keys(defs).length} iconos SVG, ${Object.keys(EXTENSIONS).length} extensiones, ${Object.keys(FILE_NAMES).length} nombres, ${Object.keys(FOLDERS).length} carpetas)`);
}

if (require.main === module) main();

module.exports = { FILES, EXTENSIONS, FILE_NAMES, LANGUAGE_IDS, FOLDERS };
