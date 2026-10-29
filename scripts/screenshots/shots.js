// @ts-nocheck
// Capturas: instalación limpia del VSIX en un perfil temporal y un arranque por captura.
// Son capturas de la ventana real de VS Code, sin retocar, pintadas al doble de
// resolución (cdp.scale): nítidas en pantallas de 1080p y de alta densidad.
//   node shots.js <repo> <rawDir> <profileDir> <vsix> <cmd-probe.vsix>   (lo lanza index.js)
//   ONLY=theme-dark.png,icons-dark.png node shots.js …                     (solo esas, con el perfil ya creado)
const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const [, , repo, outDir, profile, vsixPath, probeVsix] = process.argv;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const { vscode, cleanEnv } = require('./env');
const { connect } = require('./cdp');
const { TRACK, writeCover } = require('./cover');
const env = cleanEnv();
/**
 * La carpeta que contiene el proyecto hace de carpeta personal: el prompt muestra
 * «~\oldest-house» en lugar de la ruta de la carpeta temporal, y no salen ni se
 * tocan tu configuración de Git ni tu historial de PowerShell. Sin AppData\Local,
 * Windows PowerShell guardaría su caché de módulos en la carpeta del proyecto.
 */
function vsEnv(folder) {
  const home = path.dirname(folder);
  for (const dir of ['Local', 'Roaming']) fs.mkdirSync(path.join(home, 'AppData', dir), { recursive: true });
  return { ...env, USERPROFILE: home, HOME: home };
}
const { exe, cliJs } = vscode();
const cli = (args) => execFileSync(exe, [cliJs, ...args], { env: { ...env, ELECTRON_RUN_AS_NODE: '1' }, encoding: 'utf8' }).trim();
const ud = path.join(profile, 'user-data');
const ext = path.join(profile, 'extensions');
const ws = path.join(profile, 'oldest-house');
// Sin ventana de consola: quitaría el foco a VS Code y cerraría los popups.
const ps = (args) =>
  execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'capture.ps1'), ...args], { encoding: 'utf8', windowsHide: true }).trim();

/**
 * La sesión multimedia de prueba de la gramola (media-session.ps1): una
 * canción inventada que suena en silencio, para no tocar la música del usuario.
 */
function startMediaSession() {
  const { cover, wav } = writeCover(path.join(profile, 'jukebox'));
  const args = ['-Cover', cover, '-Wav', wav, '-Title', TRACK.title, '-Artist', TRACK.artist, '-Album', TRACK.album, '-Seconds', '120'];
  return spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'media-session.ps1'), ...args], { stdio: 'ignore', windowsHide: true });
}

const NL = String.fromCharCode(10);
const put = (rel, content) => {
  fs.mkdirSync(path.dirname(path.join(ws, rel)), { recursive: true });
  fs.writeFileSync(path.join(ws, rel), content);
};

/**
 * Una captura por arranque. `size` es el tamaño de la ventana en píxeles de VS
 * Code (la imagen sale al doble): 1280 × 800 por defecto, como un portátil, para
 * que en la página de detalles el texto no quede diminuto.
 */
const SIZE = [1280, 800];
/** Primeros planos: media ventana, que en la página de detalles se ve casi a tamaño real. */
const CLOSE_UP_SIZE = [800, 500];
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
  { theme: 'CONTROL Dark', out: 'icons-dark.png', file: 'package.json', line: 2, size: CLOSE_UP_SIZE, workspace: 'dossiers', extra: { ...CLOSE_UP, ...COLOR_ICONS } },
  // Con el explorador arriba: las carpetas y sus emblemas (el de CONTROL Dark muestra los archivos).
  { theme: 'CONTROL Astral', out: 'icons-astral.png', file: 'package.json', line: 2, size: CLOSE_UP_SIZE, workspace: 'dossiers', extra: { ...CLOSE_UP, 'explorer.autoReveal': false } },
  // Lo que no tiene ningún otro tema, cada uno en un tema distinto.
  { theme: 'CONTROL Dark', out: 'oldest-house.png', file: 'src/archive.ts', line: 18, extra: { 'cmdProbe.command': 'bureauTheme.openOldestHouse' } },
  // La gramola con la sesión de prueba; el popup sale con el ratón virtual (cdp.js), sin mover el del usuario.
  { theme: 'CONTROL Resonant', out: 'jukebox.png', file: 'src/sectors.py', line: 17, extra: { ...COLOR_ICONS, 'bureauTheme.music.enabled': true }, mediaSession: true, hover: 'bureauTheme.music' },
  // Modo Clasificado: el cursor baja una línea «con el teclado» y solo esa se revela.
  { theme: 'CONTROL Black', out: 'classified.png', file: '.env', line: 2, extra: { ...COLOR_ICONS, 'bureauTheme.classified.enabled': true }, keys: ['ArrowDown'] },
  // La guía cambia el título de la ventana: se busca por la carpeta.
  { theme: 'CONTROL Astral', out: 'welcome.png', file: 'src/hotline.js', line: 18, title: '- oldest-house', extra: { 'cmdProbe.command': 'bureauTheme.openWelcome' } },
  // La terminal Bureau: los cinco estilos del prompt en la misma terminal, con el panel
  // maximizado. El estilo cambia antes de cada Enter, así que el prompt siguiente ya sale
  // con el nuevo; el último comando falla. Va en su propia copia del proyecto: el panel
  // maximizado se guarda por carpeta y no debe salir en las demás capturas.
  {
    theme: 'CONTROL Dark',
    out: 'terminal-styles.png',
    file: 'src/archive.ts',
    line: 18,
    size: [1000, 640],
    workspace: 'terminal-styles/oldest-house',
    extra: {
      'bureauTheme.terminal.prompt': 'signage',
      'workbench.panel.opensMaximized': 'always',
      // Sin el nombre de la terminal en la barra del panel: al cambiar de estilo cambia el
      // PROMPT de cmd y VS Code le pone el aviso de «reiniciar», que aquí no viene a cuento.
      'terminal.integrated.tabs.showActiveTerminal': 'never',
      'cmdProbe.command': 'bureauTheme.newBureauTerminal',
    },
    keys: [
      { text: 'git status --short' },
      { set: { 'bureauTheme.terminal.prompt': 'dossier' } },
      'Enter',
      { text: 'git log --oneline --decorate -1' },
      { set: { 'bureauTheme.terminal.prompt': 'controlPoint' } },
      'Enter',
      { text: 'node --version' },
      { set: { 'bureauTheme.terminal.prompt': 'board' } },
      'Enter',
      { text: 'git branch' },
      { set: { 'bureauTheme.terminal.prompt': 'alertLevel' } },
      'Enter',
      { text: 'git checkout release' },
      'Enter',
    ],
  },
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
        'terminal.integrated.fontSize': 14,
        // Una sola terminal, la que abre la captura, sin la línea fija de arriba.
        'terminal.integrated.hideOnStartup': 'always',
        'terminal.integrated.enablePersistentSessions': false,
        'terminal.integrated.stickyScroll.enabled': false,
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
        // Los botones de la ventana los pinta VS Code: así salen en la captura.
        'window.controlsStyle': 'custom',
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

async function launch(file, line, folder = ws, port = 0) {
  const args = [`--user-data-dir=${ud}`, `--extensions-dir=${ext}`, '--force-device-scale-factor=1', '--new-window', folder];
  if (port) args.push(`--remote-debugging-port=${port}`);
  if (file) args.push('--goto', `${path.join(folder, file)}:${line}:5`);
  const child = spawn(exe, args, { env: vsEnv(folder), detached: true, stdio: 'ignore' });
  child.unref();
}

const titleOf = (file, folder = ws) => `${path.basename(file)} - ${path.basename(folder)}`;

/**
 * Espera a la ventana y le da tamaño. Windows le suma un borde invisible de 8
 * píxeles a los lados y abajo, que no sale en la captura.
 */
async function waitForWindow(title, [w, h] = SIZE) {
  for (let i = 0; i < 60; i++) {
    await sleep(500);
    try {
      ps(['-TitleContains', title, '-Width', String(w + 16), '-Height', String(h + 8)]);
      return;
    } catch {
      // todavía no
    }
  }
  throw new Error(`no aparece la ventana ${title}`);
}

/**
 * Arranca VS Code con los ajustes de la captura y el puerto de depuración, lo
 * pinta al doble de resolución, espera a que cargue y guarda la ventana. Las
 * teclas y el ratón llegan por el puerto (cdp.js); `{ set }` cambia ajustes
 * con la ventana abierta.
 */
async function shoot(s, i) {
  const folder = s.workspace ? path.join(profile, s.workspace) : ws;
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(path.dirname(folder), { recursive: true });
    fs.cpSync(ws, folder, { recursive: true });
  }
  let extra = s.extra;
  settings(s.theme, extra);
  const session = s.mediaSession ? startMediaSession() : null;
  const port = 9333 + i;
  try {
    await launch(s.file, s.line, folder, port);
    const title = s.title ?? titleOf(s.file, folder);
    await waitForWindow(titleOf(s.file, folder), s.size);
    // El cursor de verdad, fuera: encima de la ventana abriría popups y resaltados.
    ps(['-TitleContains', title, '-ParkCursor']);
    const cdp = await connect(port);
    try {
      await cdp.scale(2); // antes de que cargue: el editor y la terminal se pintan ya a 2×
      await sleep(11000); // servidor de lenguaje y semantic tokens
      // Una tecla, texto escrito donde esté el foco ({text}) o ajustes nuevos ({set});
      // tras Enter, tiempo para el comando.
      for (const key of s.keys ?? []) {
        if (typeof key === 'string') await cdp.press(key);
        else if ('set' in key) {
          extra = { ...extra, ...key.set };
          settings(s.theme, extra);
          await sleep(3000);
        } else await cdp.type(key.text);
        if (key === 'Enter') await sleep(2500);
      }
      if (s.hover) await cdp.hoverStatusItem(s.hover);
      // Con la escala emulada, el lienzo WebGL de la terminal puede quedarse a 1× y pintar
      // las letras el doble de grandes (pasaba con la terminal debajo del editor, y ni
      // cambiar de tamaño ni de escala lo arreglaba): mejor fallar que publicarla así.
      const stale = await cdp.evaluate(`[...document.querySelectorAll('.terminal .xterm-screen canvas')].filter((c) => c.width < parseFloat(c.style.width) * 1.5).length`);
      if (stale) throw new Error(`${s.out}: la terminal se ha pintado a 1× (letras el doble de grandes)`);
      await cdp.screenshot(path.join(outDir, s.out));
      console.log(s.out, await cdp.evaluate('[innerWidth * 2, innerHeight * 2].join(" × ")'));
    } finally {
      cdp.close();
      ps(['-TitleContains', title, '-Close']);
    }
  } finally {
    session?.kill();
  }
  await sleep(3500);
}

const ONLY = process.env.ONLY;
(async () => {
  if (ONLY) {
    for (const [i, s] of SHOTS.entries()) if (ONLY.split(',').includes(s.out)) await shoot(s, i);
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
  // Valores inventados: en la captura del Modo Clasificado salen tapados.
  put(
    '.env',
    [
      '# Bureau Archive: local settings',
      'SECTOR=research',
      'FBC_CLEARANCE=5',
      'PORT=8080',
      'DATABASE_URL=postgres://archivist:astral-plane-42@localhost:5432/bureau',
      'HOTLINE_TOKEN=ring-ring-0117',
      "API_KEY='sk-fbc-0000-not-a-real-key'",
      'BOARD_SECRET=<<THE_BOARD_SEES_ALL>>',
      '',
    ].join(NL)
  );
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
    ps(['-TitleContains', 'oldest-house', '-Close']);
  } catch (e) {
    console.log('warm close:', e.message.split(NL)[0]);
  }
  await sleep(4000);

  // --- Un arranque por captura -------------------------------------------------
  for (const [i, s] of SHOTS.entries()) await shoot(s, i);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
