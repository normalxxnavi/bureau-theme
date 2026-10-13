// @ts-nocheck
// Capturas: instalación limpia del VSIX en un perfil temporal y un arranque por tema.
//   node shots.js <repo> <rawDir> <profileDir> <vsix> <cmd-probe.vsix>   (lo lanza index.js)
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

const SHOTS = [
  { theme: 'CONTROL Dark', out: 'raw-dark.png', file: 'src/archive.ts', line: 34 },
  { theme: 'CONTROL Black', out: 'raw-black.png', file: 'src/Bureau.cs', line: 52, extra: { 'workbench.productIconTheme': 'bureau-product-icons-color' } },
  { theme: 'CONTROL Resonant', out: 'raw-resonant.png', file: 'src/sectors.py', line: 18, extra: { 'workbench.productIconTheme': 'bureau-product-icons-color', 'terminal.integrated.fontSize': 12, 'terminal.integrated.lineHeight': 1 } },
  { theme: 'CONTROL Astral', out: 'raw-astral.png', file: 'src/hotline.js', line: 20 },
  { theme: 'CONTROL Black', out: 'hero-black.png', file: 'src/archive.ts', line: 34 },
  { theme: 'CONTROL Resonant', out: 'hero-resonant.png', file: 'src/archive.ts', line: 34, extra: { 'bureauTheme.font': 'bureau', 'editor.fontFamily': "'Interstate Mono', 'Overpass Mono', monospace", 'terminal.integrated.fontFamily': "'Interstate Mono', 'Overpass Mono', monospace" } },
  { theme: 'CONTROL Astral', out: 'hero-astral.png', file: 'src/archive.ts', line: 34 },
  { theme: 'CONTROL Dark', out: 'raw-console.png', file: 'src/archive.ts', line: 34, extra: { 'cmdProbe.command': 'bureauTheme.soundMenu' } },
  { theme: 'CONTROL Dark', out: 'raw-dark-top.png', file: 'src/archive.ts', line: 34, extra: { 'workbench.activityBar.location': 'top' } },
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
        'terminal.integrated.fontSize': 13,
        'window.restoreWindows': 'none',
        'security.workspace.trust.enabled': false,
        'task.allowAutomaticTasks': 'on',
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

async function launch(file, line) {
  const args = [`--user-data-dir=${ud}`, `--extensions-dir=${ext}`, '--new-window', ws];
  if (file) args.push('--goto', `${path.join(ws, file)}:${line}:5`);
  const child = spawn(exe, args, { env, detached: true, stdio: 'ignore' });
  child.unref();
}

const titleOf = (file) => `${path.basename(file)} - oldest-house`;

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

const ONLY = process.env.ONLY;
(async () => {
  if (ONLY) {
    for (const s of SHOTS.filter((x) => ONLY.split(',').includes(x.out))) {
      settings(s.theme, s.extra);
      await launch(s.file, s.line);
      const title = titleOf(s.file);
      await waitForWindow(title);
      await sleep(12000);
      console.log(s.out, ps(['-TitleContains', title, '-OutFile', path.join(outDir, s.out), '-Width', '1600', '1000' === '1000' ? '-Height' : '', '1000']));
      ps(['-TitleContains', title, '-OutFile', 'x', '-Close']);
      await sleep(3500);
    }
    return;
  }
  fs.rmSync(profile, { recursive: true, force: true });
  fs.mkdirSync(path.join(ud, 'User'), { recursive: true });
  console.log(cli([`--user-data-dir=${ud}`, `--extensions-dir=${ext}`, '--install-extension', vsixPath]).split(NL).pop());
  cli([`--user-data-dir=${ud}`, `--extensions-dir=${ext}`, '--install-extension', probeVsix]);

  // --- Proyecto de demostración con estructura real -------------------------
  const tw = path.join(repo, 'test-workspace');
  const copy = (from, to) => {
    fs.mkdirSync(path.dirname(path.join(ws, to)), { recursive: true });
    fs.copyFileSync(path.join(tw, from), path.join(ws, to));
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
  for (const s of SHOTS) {
    settings(s.theme, s.extra);
    await launch(s.file, s.line);
    const title = titleOf(s.file);
    await waitForWindow(title);
    await sleep(11000); // servidor de lenguaje, semantic tokens y la tarea de la terminal
    console.log(s.out, ps(['-TitleContains', title, '-OutFile', path.join(outDir, s.out), '-Width', '1600', '-Height', '1000']));
    ps(['-TitleContains', title, '-OutFile', 'x', '-Close']);
    await sleep(3500);
  }
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
