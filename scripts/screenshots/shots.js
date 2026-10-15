// @ts-nocheck
// Capturas: instalación limpia del VSIX en un perfil temporal y un arranque por captura.
// Son capturas de la ventana real de VS Code, sin retocar.
//   node shots.js <repo> <rawDir> <profileDir> <vsix> <cmd-probe.vsix>   (lo lanza index.js)
//   ONLY=theme-dark.png,icons-dark.png node shots.js …                     (solo esas, con el perfil ya creado)
const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const [, , repo, outDir, profile, vsixPath, probeVsix] = process.argv;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const { vscode, cleanEnv } = require('./env');
const env = cleanEnv();
const { exe, cliJs } = vscode();
const cli = (args) => execFileSync(exe, [cliJs, ...args], { env: { ...env, ELECTRON_RUN_AS_NODE: '1' }, encoding: 'utf8' }).trim();
const ud = path.join(profile, 'user-data');
const ext = path.join(profile, 'extensions');
const ws = path.join(profile, 'oldest-house');
const ps = (args) =>
  execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'capture.ps1'), ...args], { encoding: 'utf8' }).trim();

const NL = String.fromCharCode(10);
const put = (rel, content) => {
  fs.mkdirSync(path.dirname(path.join(ws, rel)), { recursive: true });
  fs.writeFileSync(path.join(ws, rel), content);
};

/**
 * Una captura por arranque. `dpr` fuerza la escala de VS Code: 1 = píxel a píxel
 * (como en un monitor al 100 %), 2 = primer plano a doble resolución.
 */
const COLOR_ICONS = { 'workbench.productIconTheme': 'bureau-product-icons-color' };
/**
 * Primeros planos: sin minimapa, para que se vean el explorador, las pestañas y
 * las barras. Van en una copia del proyecto («dossiers») con su propio estado.
 */
const CLOSE_UP = { 'editor.minimap.enabled': false, 'breadcrumbs.enabled': false };
// Nombres que nunca se usaron para las imágenes compuestas antiguas: la página de
// detalles las lee de GitHub y así nunca puede mostrar una versión vieja en caché.
const SHOTS = [
  { theme: 'CONTROL Dark', out: 'control-dark.png', file: 'src/archive.ts', line: 18 },
  { theme: 'CONTROL Black', out: 'control-black.png', file: 'src/Bureau.cs', line: 50, extra: COLOR_ICONS },
  { theme: 'CONTROL Resonant', out: 'control-resonant.png', file: 'src/sectors.py', line: 17, extra: COLOR_ICONS },
  { theme: 'CONTROL Astral', out: 'control-astral.png', file: 'src/hotline.js', line: 18 },
  { theme: 'CONTROL Dark', out: 'sounds.png', file: 'src/archive.ts', line: 18, extra: { 'cmdProbe.command': 'bureauTheme.soundMenu' } },
  { theme: 'CONTROL Dark', out: 'icons-dark.png', file: 'package.json', line: 2, dpr: 2, workspace: 'dossiers', extra: { ...CLOSE_UP, ...COLOR_ICONS } },
  // Con el explorador arriba: las carpetas y sus emblemas (el de CONTROL Dark muestra los archivos).
  { theme: 'CONTROL Astral', out: 'icons-astral.png', file: 'package.json', line: 2, dpr: 2, workspace: 'dossiers', extra: { ...CLOSE_UP, 'explorer.autoReveal': false } },
];

const fontsFor = (t) =>
  t === 'CONTROL Resonant'
    ? { 'editor.fontFamily': "'Space Mono', monospace", 'terminal.integrated.fontFamily': "'Space Mono', monospace" }
    : { 'editor.fontFamily': "'Interstate Mono', 'Overpass Mono', monospace", 'terminal.integrated.fontFamily': "'Interstate Mono', 'Overpass Mono', monospace" };

function settings(theme, extra = {}) {
  fs.writeFileSync(
    path.join(ud, 'User', 'settings.json'),
    JSON.stringify(
      {
        'workbench.colorTheme': theme,
        'workbench.iconTheme': 'bureau-icons',
        'workbench.productIconTheme': 'bureau-product-icons',
        'bureauTheme.font': 'auto',
        ...fontsFor(theme),
        'workbench.startupEditor': 'none',
        'workbench.tips.enabled': false,
        'editor.fontSize': 14,
        'editor.lineHeight': 22,
        'editor.stickyScroll.enabled': false,
        'terminal.integrated.fontSize': 13,
        'window.restoreWindows': 'none',
        'security.workspace.trust.enabled': false,
        'task.allowAutomaticTasks': 'off',
        'chat.disableAIFeatures': true,
        'workbench.secondarySideBar.defaultVisibility': 'hidden',
        'update.mode': 'none',
        'telemetry.telemetryLevel': 'off',
        'extensions.ignoreRecommendations': true,
        'git.enabled': true,
        'git.openRepositoryInParentFolders': 'never',
        'editor.inlayHints.enabled': 'off',
        'editor.lightbulb.enabled': 'off',
        'workbench.layoutControl.enabled': false,
        'window.zoomLevel': 0,
        'editor.bracketPairColorization.enabled': true,
        'editor.guides.bracketPairs': 'active',
        'explorer.compactFolders': false,
        'breadcrumbs.enabled': true,
        ...extra,
      },
      null,
      2
    )
  );
}

async function launch(file, line, dpr = 1, folder = ws) {
  const args = [`--user-data-dir=${ud}`, `--extensions-dir=${ext}`, `--force-device-scale-factor=${dpr}`, '--new-window', folder];
  if (file) args.push('--goto', `${path.join(folder, file)}:${line}:5`);
  const child = spawn(exe, args, { env, detached: true, stdio: 'ignore' });
  child.unref();
}

const titleOf = (file, folder = ws) => `${path.basename(file)} - ${path.basename(folder)}`;

async function waitForWindow(title) {
  for (let i = 0; i < 60; i++) {
    await sleep(500);
    try {
      ps(['-TitleContains', title, '-OutFile', 'x', '-Width', '1600', '-Height', '1000', '-ResizeOnly']);
      return;
    } catch {
      // todavía no
    }
  }
  throw new Error(`no aparece la ventana ${title}`);
}

/** Arranca VS Code con los ajustes de la captura, espera a que cargue y guarda la ventana. */
async function shoot(s) {
  const folder = s.workspace ? path.join(profile, s.workspace) : ws;
  if (!fs.existsSync(folder)) fs.cpSync(ws, folder, { recursive: true });
  settings(s.theme, s.extra);
  await launch(s.file, s.line, s.dpr, folder);
  const title = titleOf(s.file, folder);
  await waitForWindow(title);
  await sleep(11000); // servidor de lenguaje y semantic tokens
  console.log(s.out, ps(['-TitleContains', title, '-OutFile', path.join(outDir, s.out), '-Width', '1600', '-Height', '1000']));
  ps(['-TitleContains', title, '-OutFile', 'x', '-Close']);
  await sleep(3500);
}

const ONLY = process.env.ONLY;
(async () => {
  if (ONLY) {
    for (const s of SHOTS.filter((x) => ONLY.split(',').includes(x.out))) await shoot(s);
    return;
  }
  fs.rmSync(profile, { recursive: true, force: true });
  fs.mkdirSync(path.join(ud, 'User'), { recursive: true });
  console.log(cli([`--user-data-dir=${ud}`, `--extensions-dir=${ext}`, '--install-extension', vsixPath]).split(NL).pop());
  cli([`--user-data-dir=${ud}`, `--extensions-dir=${ext}`, '--install-extension', probeVsix]);

  // --- Proyecto de demostración con estructura real -------------------------
  const tw = path.join(repo, 'test-workspace');
  // Sin los comentarios de cabecera de los archivos de prueba («Archivo de prueba del
  // tema…»): en las capturas solo debe verse código normal.
  const stripHeader = (text) => {
    const lines = text.split(NL);
    while (lines.length && (/^\s*(\/\/|--\s)/.test(lines[0]) || /Archivo de prueba/.test(lines[0]))) lines.shift();
    while (lines.length && !lines[0].trim()) lines.shift();
    return lines.join(NL);
  };
  const copy = (from, to) => {
    fs.mkdirSync(path.dirname(path.join(ws, to)), { recursive: true });
    fs.writeFileSync(path.join(ws, to), stripHeader(fs.readFileSync(path.join(tw, from), 'utf8')));
  };
  copy('typescript.ts', 'src/archive.ts');
  copy('csharp.cs', 'src/Bureau.cs');
  copy('python.py', 'src/sectors.py');
  copy('javascript.js', 'src/hotline.js');
  copy('razor.cshtml', 'src/views/Sectors.cshtml');
  copy('html.html', 'public/index.html');
  copy('css.css', 'src/styles/bureau.css');
  copy('scss.scss', 'src/styles/sectors.scss');
  copy('sql.sql', 'db/objects.sql');
  copy('json.json', 'data/sectors.json');
  copy('yaml.yaml', 'config/bureau.yaml');
  copy('markdown.md', 'docs/incident-117.md');
  copy('typescript.ts', 'test/archive.test.ts');
  fs.copyFileSync(path.join(repo, 'images', 'icon.png'), path.join(ws, 'public', 'icon.png'));
  fs.mkdirSync(path.join(ws, 'assets', 'sounds'), { recursive: true });
  fs.copyFileSync(path.join(repo, 'sounds', 'control', 'theme.wav'), path.join(ws, 'assets', 'sounds', 'hotline.wav'));
  put('scripts/test-report.js', fs.readFileSync(path.join(__dirname, 'test-report.js')));
  put('package.json', JSON.stringify({ name: 'bureau-archive', version: '1.0.0', private: true, scripts: { test: 'node scripts/test-report.js' } }, null, 2) + NL);
  put('tsconfig.json', '{ "compilerOptions": { "strict": true, "target": "ES2022", "experimentalDecorators": true } }' + NL);
  put('README.md', '# Bureau Archive' + NL);
  put('LICENSE', 'MIT' + NL);
  put('.env', 'FBC_CLEARANCE=5' + NL);
  put('.gitignore', 'node_modules/' + NL);
  put('Dockerfile', 'FROM node:22' + NL);
  put('docker-compose.yml', 'services:' + NL + '  archive:' + NL + '    build: .' + NL);
  put('CHANGELOG.md', '# Changelog' + NL);
  put('.prettierrc', '{ "singleQuote": true }' + NL);
  put('eslint.config.js', 'export default [];' + NL);
  put('vite.config.ts', "export default { root: 'public' };" + NL);
  put('.editorconfig', 'root = true' + NL);
  put('node_modules/.package-lock.json', '{}');
  put('.vscode/settings.json', '{}' + NL);
  put(
    '.vscode/tasks.json',
    JSON.stringify(
      {
        version: '2.0.0',
        tasks: [
          {
            label: 'test',
            type: 'shell',
            command: 'node scripts/test-report.js',
            runOptions: { runOn: 'folderOpen' },
            presentation: { reveal: 'always', panel: 'dedicated', showReuseMessage: false, echo: false },
            problemMatcher: [],
          },
        ],
      },
      null,
      2
    )
  );
  for (const a of [['init', '-q', '-b', 'main'], ['config', 'user.name', 'Bureau'], ['config', 'user.email', 'archive@example.invalid'], ['add', '-A'], ['commit', '-q', '-m', 'Archivo inicial']]) {
    execFileSync('git', a, { cwd: ws });
  }
  // Un cambio sin confirmar: decoración de Git en el explorador y badge en la barra de actividad.
  fs.appendFileSync(path.join(ws, 'data', 'sectors.json'), NL);
  fs.appendFileSync(path.join(ws, 'config', 'bureau.yaml'), '# revisado' + NL);

  // --- 1er arranque: la extensión instala las tipografías ----------------------
  settings('CONTROL Dark');
  await launch(null);
  await sleep(14000);
  try {
    ps(['-TitleContains', 'oldest-house', '-OutFile', 'x', '-Close']);
  } catch (e) {
    console.log('warm close:', e.message.split(NL)[0]);
  }
  await sleep(4000);

  // --- Un arranque por captura -------------------------------------------------
  for (const s of SHOTS) await shoot(s);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
