// @ts-nocheck
// Imágenes de presentación para el README: compone las capturas en bruto sobre
// fondos diseñados por tema y genera las vitrinas de iconos y tipografía.
//   node compose.js <repo> <rawDir> <outDir> [solo,estas]   (lo lanza index.js)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const [, , repo, rawDir, outDir, only] = process.argv;
const { WORK, vscode, browser } = require('./env');
const HTML = path.join(WORK, 'html');
fs.mkdirSync(HTML, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

const u = (p) => 'file:///' + p.split(path.sep).join('/').replace(/ /g, '%20');
const EDGE = browser();
const VSC = vscode().out;

function render(name, body, w, h, extraCss = '') {
  if (only && !only.split(',').includes(name)) return;
  const file = path.join(HTML, name + '.html');
  fs.writeFileSync(
    file,
    `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}
*{box-sizing:border-box}html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden}
body{position:relative;-webkit-font-smoothing:antialiased}
${extraCss}</style></head><body>${body}</body></html>`
  );
  const out = path.join(outDir, name + '.png');
  fs.rmSync(out, { force: true });
  execFileSync(EDGE, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--user-data-dir=${path.join(WORK, 'edge-profiles', name)}`, `--window-size=${w},${h}`,
    '--virtual-time-budget=4000', `--screenshot=${out}`, u(file),
  ], { timeout: 90000, stdio: 'pipe' });
  // Edge puede volver antes de que su proceso hijo escriba el PNG.
  for (let i = 0; i < 100 && !fs.existsSync(out); i++) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  console.log('✔', name, `${w}×${h}`, Math.round(fs.statSync(out).size / 1024) + ' KB');
}

// --- Tipografías e iconos ----------------------------------------------------
const F = (...p) => u(path.join(repo, 'fonts', ...p));
const FONTS = `
@font-face{font-family:'Overpass';src:url(${F('bureau', 'Overpass-Variable.ttf')});font-weight:100 900}
@font-face{font-family:'Overpass Mono';src:url(${F('bureau', 'OverpassMono-Variable.ttf')});font-weight:300 700}
@font-face{font-family:'Space Grotesk';src:url(${F('resonant', 'SpaceGrotesk-Variable.ttf')});font-weight:300 700}
@font-face{font-family:'Space Mono';src:url(${F('resonant', 'SpaceMono-Regular.ttf')});font-weight:400}
@font-face{font-family:'Space Mono';src:url(${F('resonant', 'SpaceMono-Bold.ttf')});font-weight:700}
@font-face{font-family:'Bureau';src:url(${u(path.join(repo, 'product-icons', 'bureau-product-icons.woff'))}) format('woff')}
@font-face{font-family:'BureauColor';src:url(${u(path.join(repo, 'product-icons', 'bureau-product-icons-color.woff'))}) format('woff')}
@font-face{font-family:'codicon';src:url(${u(path.join(VSC, 'media', 'codicon.ttf'))})}
.g{font-family:'Bureau';font-style:normal;line-height:1}
.k{font-family:'BureauColor';font-style:normal;line-height:1}
.c{font-family:'codicon';font-style:normal;line-height:1}`;

const palette = (id) => {
  const p = require(path.join(repo, 'src', 'theme', 'palettes', id + '.js'));
  return p.default || p;
};
const hexA = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};

// Ruido de hormigón (SVG feTurbulence) para los fondos.
const grain = (opacity, freq = 0.9) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 ${opacity} 0'/></filter><rect width='300' height='300' filter='url(%23n)'/></svg>`
  )}")`;

// Pirámide invertida del Consejo (contorno).
const board = (x, y, size, color, stroke = 2, opacity = 1) =>
  `<svg style="position:absolute;left:${x}px;top:${y}px;opacity:${opacity}" width="${size}" height="${size * 0.92}" viewBox="0 0 100 92"><polygon points="2,2 98,2 50,90" fill="none" stroke="${color}" stroke-width="${stroke}" vector-effect="non-scaling-stroke"/><polygon points="36,14 64,14 50,40" fill="${color}" opacity=".85"/></svg>`;

// --- Temas ---------------------------------------------------------------------
const THEMES = {
  dark: {
    n: '01', raw: 'raw-dark.png', heroRaw: 'raw-dark.png', font: 'Overpass', mono: 'Overpass Mono',
    tagline: 'The Oldest House', game: 'Control (2019)', blurb: 'Brutalist concrete, Bureau signage and FBC red.',
    typo: 'Bureau typography · Overpass Mono', icons: 'Bureau Product Icons',
  },
  black: {
    n: '02', raw: 'raw-black.png', heroRaw: 'hero-black.png', font: 'Overpass', mono: 'Overpass Mono',
    tagline: 'The Astral Plane in negative', game: 'Control (2019)', blurb: 'True black for OLED, astral-white signage, red only for details.',
    typo: 'Bureau typography · Overpass Mono', icons: 'Bureau Product Icons (Color)',
  },
  resonant: {
    n: '03', raw: 'raw-resonant.png', heroRaw: 'hero-resonant.png', font: 'Space Grotesk', mono: 'Space Mono',
    tagline: 'Patterned Manhattan', game: 'Control Resonant (2026)', blurb: 'Steel blue and resonance cyan. Red belongs to the Hiss.',
    typo: 'Resonant typography · Space Mono', icons: 'Bureau Product Icons (Color)',
  },
  astral: {
    n: '04', raw: 'raw-astral.png', heroRaw: 'hero-astral.png', font: 'Overpass', mono: 'Overpass Mono',
    tagline: 'The Astral Plane', game: 'Control (2019)', blurb: 'A white void framed by black geometry. AAA text, vivid code.',
    typo: 'Bureau typography · Overpass Mono', icons: 'Bureau Product Icons',
  },
};
for (const [id, t] of Object.entries(THEMES)) {
  const p = palette(id);
  Object.assign(t, { id, p, name: p.label, light: p.type === 'light' });
}

function backdrop(t, W, H) {
  const { p } = t;
  if (t.id === 'dark')
    return `<div style="position:absolute;inset:0;background:radial-gradient(1200px 700px at 70% 30%,#1D1E21,#0B0C0D 70%)"></div>
      <div style="position:absolute;inset:0;background:${grain(0.10)}"></div>
      ${board(W - 640, -90, 760, p.accent.main, 1.5, 0.12)}
      <div style="position:absolute;left:0;right:0;top:${H - 8}px;height:8px;background:${p.accent.main}"></div>`;
  if (t.id === 'black')
    return `<div style="position:absolute;inset:0;background:#000"></div>
      <div style="position:absolute;inset:0;background:${grain(0.06)}"></div>
      <svg style="position:absolute;inset:0" width="${W}" height="${H}"><g fill="none" stroke="#ECEAE4" stroke-opacity=".16">
        <line x1="${W - 520}" y1="0" x2="${W}" y2="520"/><line x1="${W - 380}" y1="0" x2="${W}" y2="380"/>
        <line x1="0" y1="${H - 60}" x2="${W}" y2="${H - 60}"/></g></svg>
      <div style="position:absolute;left:0;right:0;top:${H - 6}px;height:6px;background:#ECEAE4"></div>`;
  if (t.id === 'resonant')
    return `<div style="position:absolute;inset:0;background:radial-gradient(1100px 650px at 60% 55%,#14262B,#0A0C0F 70%)"></div>
      <div style="position:absolute;inset:0;background:
        repeating-linear-gradient(90deg,${hexA(p.accent.main, 0.07)} 0 1px,transparent 1px 44px),
        repeating-linear-gradient(0deg,${hexA(p.accent.main, 0.05)} 0 1px,transparent 1px 44px)"></div>
      <div style="position:absolute;inset:0;background:repeating-linear-gradient(135deg,${hexA('#8AA8E8', 0.05)} 0 14px,transparent 14px 28px);-webkit-mask-image:linear-gradient(90deg,transparent,#000 60%)"></div>
      <div style="position:absolute;inset:0;background:${grain(0.07)}"></div>
      <div style="position:absolute;left:0;right:0;top:${H - 8}px;height:8px;background:linear-gradient(90deg,${p.accent.solid},${p.accent.main})"></div>`;
  // astral
  return `<div style="position:absolute;inset:0;background:#FAF9F6"></div>
      <div style="position:absolute;inset:0;background:${grain(0.05, 0.7)}"></div>
      <div style="position:absolute;right:0;top:0;width:360px;height:${H}px;background:#151517"></div>
      <div style="position:absolute;right:360px;top:0;width:6px;height:${H}px;background:${p.accent.line}"></div>
      <svg style="position:absolute;inset:0" width="${W}" height="${H}"><g fill="none" stroke="#151517" stroke-opacity=".5">
        <line x1="0" y1="214" x2="${W - 360}" y2="214"/><line x1="60" y1="0" x2="60" y2="${H}"/></g></svg>
      ${board(W - 300, 40, 240, '#FAF9F6', 1.5, 0.9)}`;
}

function swatches(t) {
  const { p } = t;
  const list = [
    [p.bg.editor, 'Editor'],
    [p.fg.main, 'Text'],
    [t.id === 'black' ? p.accent.line : p.accent.main === '#1A1A1C' ? p.accent.line : p.accent.main, 'Accent'],
    [p.syntax.keyword === p.accent.main ? p.accent.solid : p.syntax.keyword, p.syntax.keyword === p.accent.main ? 'Accent 2' : 'Keyword'],
    [p.syntax.type, 'Type'],
    [p.syntax.string, 'String'],
    [p.syntax.number, 'Number'],
  ];
  const fg = t.light ? '#ECEBE6' : '#D9D6CF';
  return `<div style="display:flex;gap:14px;padding:16px 18px;background:${t.light ? 'rgba(250,249,246,.92)' : 'rgba(10,11,12,.78)'};border:1px solid ${t.light ? 'rgba(0,0,0,.14)' : 'rgba(255,255,255,.08)'}">${list
    .map(
      ([c, n]) => `<div style="width:84px">
      <div style="height:44px;background:${c};border:1px solid ${t.light ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.14)'}"></div>
      <div style="font:600 12px '${t.mono}';color:${fg};margin-top:7px;letter-spacing:.04em">${n.toUpperCase()}</div>
      <div style="font:400 12px '${t.mono}';color:${fg};opacity:.6">${c.toUpperCase()}</div></div>`
    )
    .join('')}</div>`;
}

const windowFrame = (src, x, y, w, h, glow, light) =>
  `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:10px;overflow:hidden;
    box-shadow:0 0 0 1px ${light ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.10)'},0 50px 120px rgba(0,0,0,${light ? 0.32 : 0.7}),0 0 90px ${glow}">
    <img src="${src}" style="display:block;width:${w}px;height:${h}px"></div>`;

function themeImage(t) {
  const W = 1760, H = 1330;
  const { p } = t;
  const title = t.light ? '#111113' : '#F4F1EA';
  const muted = t.light ? '#4D4B45' : '#9A968F';
  const accent = t.id === 'black' ? '#ECEAE4' : t.light ? p.accent.line : p.accent.main;
  const body = `${backdrop(t, W, H)}
  <div style="position:absolute;left:80px;top:56px">
    <div style="font:600 15px '${t.mono}';letter-spacing:.32em;color:${accent}">BUREAU · CONTROL FAN THEME · ${t.n} / 04</div>
    <div style="font:800 64px/1.05 '${t.font}';color:${title};margin-top:12px;letter-spacing:-.01em">${t.name}</div>
    <div style="font:500 22px '${t.font}';color:${muted};margin-top:10px">${t.game} — <span style="color:${title}">${t.tagline}</span> <span style="opacity:.75">&nbsp;·&nbsp; ${t.blurb}</span></div>
  </div>
  <div style="position:absolute;right:${t.light ? 400 : 80}px;top:52px">${t.light ? swatchesOn(t, '#111113') : swatches(t)}</div>
  ${windowFrame(u(path.join(rawDir, t.raw)), 80, 230, 1600, 1000, hexA(accent, t.light ? 0 : 0.16), t.light)}
  <div style="position:absolute;left:80px;top:${H - 70}px;font:500 15px '${t.mono}';letter-spacing:.12em;color:${muted}">
    <span style="color:${accent}">■</span>&nbsp; BUREAU ICONS &nbsp;·&nbsp; ${t.icons.toUpperCase()} &nbsp;·&nbsp; ${t.typo.toUpperCase()}</div>`;
  render('theme-' + t.id, body, W, H);
}

// Muestras sobre fondo claro (Astral): texto oscuro.
function swatchesOn(t, fg) {
  return swatches(t).replace(/color:#ECEBE6/g, `color:${fg}`).replace(/rgba\(255,255,255,\.25\)/g, 'rgba(0,0,0,.25)');
}

// --- Portada: los cuatro temas en franjas diagonales ----------------------------
const ORDER = ['dark', 'resonant', 'black', 'astral'];
const accentOf = (id) => (id === 'black' ? '#ECEAE4' : id === 'astral' ? '#FAF9F6' : THEMES[id].p.accent.main);

/** Captura 1600×1000 cortada en cuatro franjas diagonales, una por tema. */
function slicedWindow(ww = 1600, wh = 1000, skew = 70) {
  const xs = [0, 400, 800, 1200, 1600];
  const top = (i) => (i === 0 ? 0 : i === 4 ? ww : xs[i] + skew);
  const bot = (i) => (i === 0 ? 0 : i === 4 ? ww : xs[i] - skew);
  let slices = '';
  let lines = '';
  ORDER.forEach((id, i) => {
    const poly = `polygon(${top(i)}px 0,${top(i + 1)}px 0,${bot(i + 1)}px ${wh}px,${bot(i)}px ${wh}px)`;
    slices += `<img src="${u(path.join(rawDir, THEMES[id].heroRaw))}" style="position:absolute;inset:0;width:${ww}px;height:${wh}px;clip-path:${poly}">`;
    if (i > 0) lines += `<line x1="${top(i)}" y1="0" x2="${bot(i)}" y2="${wh}" stroke="#F4F1EA" stroke-width="2" stroke-opacity=".9"/>`;
  });
  return { xs, html: `${slices}<svg style="position:absolute;inset:0" width="${ww}" height="${wh}">${lines}</svg>` };
}

function hero() {
  const W = 1800, H = 1360;
  const order = ORDER;
  const ww = 1600, wh = 1000;
  const { xs, html } = slicedWindow(ww, wh);
  let labels = '';
  order.forEach((id, i) => {
    const t = THEMES[id];
    const cx = (xs[i] + xs[i + 1]) / 2;
    const acc = id === 'black' ? '#ECEAE4' : id === 'astral' ? t.p.accent.line : t.p.accent.main;
    labels += `<div style="position:absolute;left:${100 + cx - 150}px;top:${300 + wh}px;width:300px;text-align:center">
      <div style="display:inline-flex;align-items:center;gap:10px;font:700 15px 'Overpass Mono';letter-spacing:.22em;color:#F4F1EA">
      <span style="width:12px;height:12px;background:${acc};display:inline-block"></span>${t.name.replace('CONTROL ', '').toUpperCase()}</div>
      <div style="font:500 14px 'Overpass';color:#8E8B85;margin-top:4px">${t.tagline}</div></div>`;
  });
  const p = THEMES.dark.p;
  const body = `${backdrop(THEMES.dark, W, H).replace(/<div style="position:absolute;left:0;right:0;top:\d+px;height:8px[^>]*><\/div>/, '')}
  <div style="position:absolute;left:100px;top:64px;right:100px;display:flex;align-items:flex-end;justify-content:space-between">
    <div>
      <div style="font:600 15px 'Overpass Mono';letter-spacing:.34em;color:${p.accent.main}">FEDERAL BUREAU OF CONTROL · VS CODE</div>
      <div style="font:900 96px/1 'Overpass';color:#F4F1EA;margin-top:14px;letter-spacing:-.02em">Bureau <span style="font-weight:600;font-size:44px;letter-spacing:.02em;color:#A9A59E;vertical-align:middle">CONTROL Fan Theme</span></div>
      <div style="font:500 24px 'Overpass';color:#A9A59E;margin-top:16px"><span style="color:#F4F1EA">Clearance granted.</span> Four colour themes, Bureau file &amp; product icons, game typography and a sound console.</div>
    </div>
    <img src="${u(path.join(repo, 'images', 'icon.png'))}" style="width:148px;height:148px;margin-bottom:6px;border-radius:22px;box-shadow:0 0 0 1px rgba(255,255,255,.12),0 20px 50px rgba(0,0,0,.6)">
  </div>
  <div style="position:absolute;left:100px;top:290px;width:${ww}px;height:${wh}px;border-radius:10px;overflow:hidden;
    box-shadow:0 0 0 1px rgba(255,255,255,.12),0 50px 120px rgba(0,0,0,.75),0 0 100px ${hexA(p.accent.main, 0.14)}">
    ${html}</div>
  ${labels}
  <div style="position:absolute;left:0;right:0;top:${H - 8}px;height:8px;display:flex">
    ${order.map((id) => `<div style="flex:1;background:${accentOf(id)}"></div>`).join('')}</div>`;
  render('hero', body, W, H);
}

// --- Vista previa social de GitHub (1280×640, contenido dentro de un margen de 40 px) ---
function socialImage() {
  const W = 1280, H = 640;
  const p = THEMES.dark.p;
  const scale = 0.46;
  const { html } = slicedWindow();
  const dot = `<span style="display:inline-block;width:6px;height:6px;margin:0 14px 3px;background:${p.accent.main}"></span>`;
  const body = `${backdrop(THEMES.dark, W, H).replace(/<div style="position:absolute;left:0;right:0;top:\d+px;height:8px[^>]*><\/div>/, '')}
  <div style="position:absolute;left:64px;top:96px;width:420px">
    <img src="${u(path.join(repo, 'images', 'icon.png'))}" style="width:96px;height:96px;border-radius:16px;box-shadow:0 0 0 1px rgba(255,255,255,.12),0 16px 40px rgba(0,0,0,.6)">
    <div style="font:600 13px 'Overpass Mono';letter-spacing:.26em;color:${p.accent.main};margin-top:30px">FEDERAL BUREAU OF CONTROL&nbsp;·&nbsp;VS CODE</div>
    <div style="font:900 92px/1 'Overpass';color:#F4F1EA;margin-top:10px;letter-spacing:-.02em">Bureau</div>
    <div style="font:600 30px 'Overpass';color:#A9A59E;margin-top:6px">CONTROL Fan Theme</div>
    <div style="font:500 18px/1.5 'Overpass';color:#8E8B85;margin-top:22px">Four colour themes${dot}File &amp; product icons<br>Game typography${dot}Sound console</div>
  </div>
  <div style="position:absolute;left:${W - 40 - 1600 * scale}px;top:${(H - 1000 * scale) / 2}px;width:1600px;height:1000px;transform:scale(${scale});transform-origin:0 0;
    border-radius:16px;overflow:hidden;box-shadow:0 0 0 2px rgba(255,255,255,.14),0 60px 140px rgba(0,0,0,.8),0 0 120px ${hexA(p.accent.main, 0.16)}">${html}</div>
  <div style="position:absolute;left:64px;top:${H - 62}px;font:500 12px 'Overpass Mono';letter-spacing:.08em;color:#6E6B66">Unofficial fan work · not endorsed by Remedy Entertainment</div>
  <div style="position:absolute;left:0;right:0;top:${H - 8}px;height:8px;display:flex">
    ${ORDER.map((id) => `<div style="flex:1;background:${accentOf(id)}"></div>`).join('')}</div>`;
  render('social-preview', body, W, H);
}

// --- Bureau Icons ------------------------------------------------------------------
const iconTheme = JSON.parse(fs.readFileSync(path.join(repo, 'icons', 'bureau-icon-theme.json'), 'utf8'));
const LANG = {
  ts: 'typescript', tsx: 'typescriptreact', js: 'javascript', jsx: 'javascriptreact', cs: 'csharp', py: 'python', rs: 'rust',
  go: 'go', java: 'java', css: 'css', scss: 'scss', html: 'html', md: 'markdown', json: 'json', yml: 'yaml', yaml: 'yaml',
  sql: 'sql', sh: 'shellscript', ps1: 'powershell', cshtml: 'aspnetcorerazor', xml: 'xml', php: 'php', rb: 'ruby', kt: 'kotlin',
  swift: 'swift', vue: 'vue', svelte: 'svelte', lua: 'lua', dart: 'dart', toml: 'toml', graphql: 'graphql', bat: 'bat',
  cpp: 'cpp', c: 'c', fs: 'fsharp', r: 'r', ini: 'ini', diff: 'diff', txt: 'plaintext', csv: 'csv',
};
const NAMED_LANG = { dockerfile: 'dockerfile', makefile: 'makefile' };
function iconFor(name, folder, light) {
  const lo = name.toLowerCase();
  const L = light ? iconTheme.light || {} : {};
  const pick = (key, k) => (L[key] && L[key][k]) || iconTheme[key][k];
  let id;
  if (folder) id = pick('folderNames', lo) || (light && L.folder) || iconTheme.folder;
  else {
    id = pick('fileNames', lo);
    const parts = lo.split('.');
    for (let i = 1; !id && i < parts.length; i++) id = pick('fileExtensions', parts.slice(i).join('.'));
    const lang = NAMED_LANG[lo] || LANG[parts[parts.length - 1]];
    if (!id && lang) id = pick('languageIds', lang);
    id = id || (light && L.file) || iconTheme.file;
  }
  const def = iconTheme.iconDefinitions[id];
  if (!def) throw new Error('sin icono ' + id);
  return u(path.join(repo, 'icons', def.iconPath));
}

const ICON_FOLDERS = ['src', 'test', 'docs', 'assets', 'components', 'api', 'config', '.github', '.vscode', 'node_modules', 'public', 'scripts', 'styles', 'db', 'ai', 'docker', 'images', 'fonts', 'hooks', 'auth'];
const ICON_FILES = [
  'index.ts', 'App.tsx', 'main.js', 'Program.cs', 'App.csproj', 'Index.cshtml', 'main.py', 'lib.rs', 'main.go', 'Main.java',
  'App.vue', 'index.php', 'styles.css', 'theme.scss', 'index.html', 'README.md', 'CLAUDE.md', 'CHANGELOG.md', 'package.json', 'tsconfig.json',
  '.env', '.gitignore', 'Dockerfile', 'compose.yaml', 'LICENSE', 'vite.config.ts', 'eslint.config.js', 'query.sql', 'data.csv', 'budget.xlsx',
  'report.pdf', 'logo.png', 'icon.svg', 'theme.wav', 'intro.mp4', 'font.ttf', 'archive.zip', 'cert.pem', 'deploy.sh', 'build.ps1',
  'Makefile', 'Cargo.toml', 'go.mod', 'yarn.lock', 'app.test.ts', 'schema.graphql', 'config.yaml', 'fix.diff', 'notes.txt', 'review.prompt.md',
  'main.cpp', 'app.kt', 'App.swift', 'main.dart', 'init.lua', 'Gemfile', 'requirements.txt', '.editorconfig', 'build.gradle', 'web.config',
];
const SHOWCASE = [
  ['src', 1], ['test', 1], ['.github', 1], ['assets', 1], ['config', 1], ['ai', 1], ['node_modules', 1],
  ['index.ts', 0], ['Program.cs', 0], ['main.py', 0], ['package.json', 0], ['README.md', 0], ['.env', 0], ['Dockerfile', 0], ['CLAUDE.md', 0], ['app.test.ts', 0],
];

function iconPanel(light) {
  const bg = light ? '#F1F0EB' : '#121315';
  const fg = light ? '#111113' : '#D9D6CF';
  const muted = light ? '#4D4B45' : '#8E8B85';
  const row = (name, folder) =>
    `<div style="display:flex;align-items:center;gap:9px;height:27px;white-space:nowrap;overflow:hidden">
      ${folder ? `<span class="c" style="font-size:14px;color:${muted};width:12px">&#xeab6;</span>` : '<span style="width:12px"></span>'}
      <img src="${iconFor(name, folder, light)}" width="18" height="18"><span>${name}</span></div>`;
  const items = [...ICON_FOLDERS.map((n) => row(n, true)), ...ICON_FILES.map((n) => row(n, false))];
  return `<div style="background:${bg};color:${fg};padding:26px 30px;font:400 15px 'Segoe UI';border:1px solid ${light ? '#D3D1C9' : '#2A2B2F'}">
    <div style="font:700 13px 'Overpass Mono';letter-spacing:.26em;color:${light ? '#A31A12' : '#E0352B'};margin-bottom:14px">${light ? 'CONTROL ASTRAL · LIGHT VARIANT' : 'CONTROL DARK · DARK VARIANT'}</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0 14px">${items.join('')}</div></div>`;
}

function iconsImage() {
  const W = 1760, H = 1240;
  const p = THEMES.dark.p;
  const big = SHOWCASE.map(
    ([n, folder]) => `<div style="text-align:center;width:88px"><img src="${iconFor(n, !!folder, false)}" width="64" height="64">
      <div style="font:500 13px 'Overpass Mono';color:#8E8B85;margin-top:8px;white-space:nowrap">${n}</div></div>`
  ).join('');
  const stats = [['498', 'icons'], ['340', 'extensions'], ['284', 'file names'], ['84', 'languages'], ['278', 'folder names']]
    .map(([n, l]) => `<div><div style="font:800 40px 'Overpass';color:#F4F1EA">${n}</div><div style="font:500 14px 'Overpass Mono';letter-spacing:.14em;color:#8E8B85">${l.toUpperCase()}</div></div>`)
    .join('');
  const body = `<div style="position:absolute;inset:0;background:radial-gradient(1200px 700px at 70% 20%,#1D1E21,#0B0C0D 70%)"></div>
  <div style="position:absolute;inset:0;background:${grain(0.1)}"></div>
  ${board(W - 470, -60, 520, p.accent.main, 1.5, 0.13)}
  <div style="position:absolute;left:80px;top:60px">
    <div style="font:600 15px 'Overpass Mono';letter-spacing:.32em;color:${p.accent.main}">BUREAU ICONS · FILE ICON THEME</div>
    <div style="font:800 60px/1.05 'Overpass';color:#F4F1EA;margin-top:12px">Every file gets a dossier.</div>
    <div style="font:500 22px 'Overpass';color:#A9A59E;margin-top:12px;max-width:1100px">Files carry a dossier label: their code or a pictogram over the classification band, sharp at 16 px. Folders are solid, coloured by category and carry an emblem.</div>
    <div style="display:flex;gap:56px;margin-top:30px">${stats}</div>
  </div>
  <div style="position:absolute;left:80px;right:80px;top:400px;display:flex;justify-content:space-between">${big}</div>
  <div style="position:absolute;left:80px;right:80px;top:540px;display:grid;grid-template-columns:1fr 1fr;gap:24px">${iconPanel(false)}${iconPanel(true)}</div>
  <div style="position:absolute;left:0;right:0;top:${H - 8}px;height:8px;background:${p.accent.main}"></div>`;
  render('bureau-icons', body, W, H);
}

// --- Bureau Product Icons: comparación con los iconos de VS Code ------------------------
const { GLYPHS, MAPPING } = require(path.join(repo, 'scripts', 'product-icons.js'));
const GLYPH_NAMES = Object.keys(GLYPHS);
const bundle = fs.readFileSync(path.join(VSC, 'vs', 'workbench', 'workbench.desktop.main.js'), 'utf8');
const codicon = (name) => {
  const m = bundle.match(new RegExp(`\\("${name}",(\\d+)\\)`));
  if (!m) throw new Error('codicon ' + name);
  return `&#x${Number(m[1]).toString(16)};`;
};
const bureau = (name) => {
  const g = MAPPING[name];
  if (!g) throw new Error('mapping ' + name);
  return `&#x${(0xe001 + GLYPH_NAMES.indexOf(g)).toString(16)};`;
};

const PAIRS = [
  ['files', 'Explorer', 'A Bureau dossier'],
  ['search', 'Search', 'The investigator\u2019s lens'],
  ['source-control', 'Source Control', 'The Ashtray Maze'],
  ['git-branch-changes', 'Git branch', 'The Board, marked'],
  ['debug-alt', 'Run and Debug', 'The rubber duck'],
  ['beaker', 'Testing', 'The Hedron'],
  ['copilot', 'Copilot & Chat', 'Polaris'],
  ['bell', 'Notifications', 'The Hotline'],
  ['account', 'Accounts', 'The FBC badge'],
  ['extensions', 'Extensions', 'Sector blocks'],
  ['save', 'Save', 'The floppy disk'],
  ['history', 'Timeline', 'Ahti\u2019s tape'],
  ['debug-console', 'Debug Console', 'The Benicoff TV'],
  ['output', 'Output', 'The slide projector'],
  ['shield', 'Workspace trust', 'The home safe'],
  ['clear-all', 'Clear all', 'Ahti\u2019s mop'],
  ['key', 'Keyboard shortcuts', 'The Oceanview key'],
  ['remote', 'Remote', 'The Threshold'],
  ['tools', 'Tools', 'The Aberrant'],
  ['unmute', 'Sounds', 'Resonance'],
];

function productImage() {
  const W = 1760, H = 1250;
  const p = THEMES.dark.p;
  const cards = PAIRS.map(
    ([id, label, note]) => `<div style="background:#141517;border:1px solid #2A2B2F;padding:16px 18px;display:flex;align-items:center;gap:14px">
      <span class="c" style="font-size:30px;color:#6E6B66;width:34px;text-align:center">${codicon(id)}</span>
      <span style="font:400 18px 'Overpass';color:#55534F">→</span>
      <span class="g" style="font-size:38px;color:#F4F1EA;width:42px;text-align:center">${bureau(id)}</span>
      <span class="k" style="font-size:38px;color:#F4F1EA;width:42px;text-align:center">${bureau(id)}</span>
      <div style="margin-left:2px"><div style="font:700 18px 'Overpass';color:#F4F1EA">${label}</div>
      <div style="font:500 14px 'Overpass';color:#8E8B85;margin-top:3px">${note}</div></div></div>`
  ).join('');
  const crop = (src, x, y, w, h, scale) =>
    `<div style="width:${w * scale}px;height:${h * scale}px;overflow:hidden;position:relative;border:1px solid #2A2B2F">
      <img src="${src}" style="position:absolute;left:${-x * scale}px;top:${-y * scale}px;width:${1600 * scale}px;height:${1000 * scale}px"></div>`;
  const dark = u(path.join(rawDir, 'raw-dark.png'));
  const top = u(path.join(rawDir, 'raw-dark-top.png'));
  const color = u(path.join(rawDir, 'raw-black.png'));
  const lbl = (s) => `<div style="font:600 13px 'Overpass Mono';letter-spacing:.2em;color:#8E8B85;margin-bottom:10px">${s}</div>`;
  const body = `<div style="position:absolute;inset:0;background:radial-gradient(1200px 700px at 70% 20%,#1D1E21,#0B0C0D 70%)"></div>
  <div style="position:absolute;inset:0;background:${grain(0.1)}"></div>
  ${board(W - 470, -60, 520, p.accent.main, 1.5, 0.13)}
  <div style="position:absolute;left:80px;top:60px">
    <div style="font:600 15px 'Overpass Mono';letter-spacing:.32em;color:${p.accent.main}">BUREAU PRODUCT ICONS · PRODUCT ICON THEME</div>
    <div style="font:800 60px/1.05 'Overpass';color:#F4F1EA;margin-top:12px">VS Code\u2019s own icons, reissued by the Bureau.</div>
    <div style="font:500 22px 'Overpass';color:#A9A59E;margin-top:12px">350 VS Code icons redrawn with 118 glyphs from the lore, in two versions: the theme colour and the game\u2019s real colours.</div>
  </div>
  <div style="position:absolute;left:80px;right:80px;top:270px;display:grid;grid-template-columns:repeat(4,1fr);gap:16px">${cards}</div>
  <div style="position:absolute;left:80px;top:790px;display:flex;gap:28px;align-items:flex-start">
    <div>${lbl('THEME')}${crop(dark, 0, 44, 70, 280, 1.4)}</div>
    <div>${lbl('COLOR')}${crop(color, 0, 44, 70, 280, 1.4)}</div>
    <div>${lbl('ACTIVITY BAR · TOP')}${crop(top, 14, 44, 380, 50, 1.4)}
      <div style="height:22px"></div>${lbl('TITLE BAR · TOP LAYOUT')}${crop(top, 1340, 0, 260, 44, 1.4)}</div>
    <div>${lbl('STATUS BAR · THEME')}${crop(dark, 0, 955, 420, 36, 1.2)}
      <div style="height:22px"></div>${lbl('STATUS BAR · COLOR')}${crop(color, 0, 955, 420, 36, 1.2)}
      <div style="height:22px"></div>${lbl('PANEL TOOLBAR')}${crop(dark, 1420, 592, 170, 36, 1.4)}</div>
  </div>
  <div style="position:absolute;left:0;right:0;top:${H - 8}px;height:8px;background:${p.accent.main}"></div>`;
  render('bureau-product-icons', body, W, H);
}

// --- Tipografía -------------------------------------------------------------------------------
function typographyImage() {
  const W = 1760, H = 680;
  const card = (t, kicker, mono, sans, accent, bg, notes) => `<div style="background:${bg};border:1px solid #2A2B2F;padding:34px 38px;position:relative">
    <div style="font:700 13px '${mono}';letter-spacing:.26em;color:${accent}">${kicker}</div>
    <div style="font:700 44px '${sans}';color:#F4F1EA;margin-top:14px">${t}</div>
    <div style="font:400 15px '${sans}';color:#8E8B85;margin-top:6px">${notes}</div>
    <div style="font:400 21px/1.6 '${mono}';color:#D9D6CF;margin-top:22px;white-space:pre">${
      sans === 'Overpass'
        ? '<span style="color:#E5675D">export class</span> Archive&lt;T&gt; {\n  #items = <span style="color:#E5675D">new</span> Map&lt;number, T&gt;();\n  <span style="color:#8E8B85">// Clearance level 5 required</span>\n}'
        : '<span style="color:#6FCFDC">class</span> ObjectOfPower:\n    threat: Threat = Threat.LOW\n    <span style="color:#8A9099"># Resonance detected</span>'
    }</div>
    <div style="display:flex;gap:30px;margin-top:22px;font:400 15px '${sans}';color:#A9A59E">
      <div><span style="font-family:'${mono}';color:#F4F1EA">${mono}</span> · code & terminal</div>
      <div><span style="font-family:'${sans}';color:#F4F1EA;font-weight:600">${sans}</span> · editor text</div></div></div>`;
  const body = `<div style="position:absolute;inset:0;background:radial-gradient(1200px 600px at 60% 30%,#1D1E21,#0B0C0D 70%)"></div>
  <div style="position:absolute;inset:0;background:${grain(0.1)}"></div>
  <div style="position:absolute;left:80px;top:56px">
    <div style="font:600 15px 'Overpass Mono';letter-spacing:.32em;color:#E0352B">OPTIONAL TYPOGRAPHY · SIL OPEN FONT LICENSE</div>
    <div style="font:800 54px/1.05 'Overpass';color:#F4F1EA;margin-top:12px">The Bureau\u2019s typeface, one click away.</div>
  </div>
  <div style="position:absolute;left:80px;right:80px;top:230px;display:grid;grid-template-columns:1fr 1fr;gap:24px">
    ${card('Bureau', 'CONTROL · DARK, BLACK, ASTRAL', 'Overpass Mono', 'Overpass', '#E0352B', '#141517', 'Derived from Highway Gothic, like the signage of the Oldest House.')}
    ${card('Resonant', 'CONTROL RESONANT', 'Space Mono', 'Space Grotesk', '#6FCFDC', '#121519', 'Geometric grotesque for patterned Manhattan.')}
  </div>
  <div style="position:absolute;left:0;right:0;top:${H - 8}px;height:8px;background:linear-gradient(90deg,#E0352B 50%,#6FCFDC 50%)"></div>`;
  render('typography', body, W, H);
}

hero();
socialImage();
for (const t of Object.values(THEMES)) themeImage(t);
iconsImage();
productImage();
typographyImage();
soundImage();

function soundImage() {
  const W = 1760, H = 1330;
  const p = THEMES.dark.p;
  const raw = u(path.join(rawDir, 'raw-console.png'));
  const body = `${backdrop(THEMES.dark, W, H)}
  <div style="position:absolute;left:80px;top:56px">
    <div style="font:600 15px 'Overpass Mono';letter-spacing:.32em;color:${p.accent.main}">BUREAU · SOUND CONSOLE</div>
    <div style="font:800 64px/1.05 'Overpass';color:#F4F1EA;margin-top:12px;letter-spacing:-.01em">The Bureau\u2019s switchboard.</div>
    <div style="font:500 22px 'Overpass';color:#9A968F;margin-top:10px">Click the <span style="color:#F4F1EA">resonance</span> icon in the status bar: sounds, pack, volume and events \u2014 no settings.json.</div>
  </div>
  ${windowFrame(raw, 80, 230, 1600, 1000, hexA(p.accent.main, 0.16), false)}
  <div style="position:absolute;right:56px;top:${230 + 1000 - 128}px;width:360px;height:112px;border:2px solid ${p.accent.main};border-radius:8px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.7)">
    <img src="${raw}" style="position:absolute;left:${-(1600 - 180) * 2}px;top:${-(1000 - 56) * 2}px;width:3200px;height:2000px">
  </div>
  <div style="position:absolute;right:56px;top:${230 + 1000 - 160}px;font:600 13px 'Overpass Mono';letter-spacing:.2em;color:${p.accent.main}">STATUS BAR \u00b7 2\u00d7</div>
  <div style="position:absolute;left:80px;top:${H - 70}px;font:500 15px 'Overpass Mono';letter-spacing:.12em;color:#9A968F">
    <span style="color:${p.accent.main}">\u25a0</span>&nbsp; CONTROL: OPEN SOUND CONSOLE\u2026 &nbsp;\u00b7&nbsp; HIDE IT FROM THE CONSOLE OR THE STATUS BAR MENU</div>`;
  render('sound-console', body, W, H);
}
