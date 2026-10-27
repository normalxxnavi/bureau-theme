// @ts-check
'use strict';

/**
 * Test de integración: se ejecuta DENTRO de VS Code (Extension Development
 * Host) y comprueba el módulo de sonidos de principio a fin con eventos
 * reales. Lo lanza `npm run test:integration` (scripts/integration.js) sobre
 * una copia temporal de test-workspace y un perfil de VS Code aislado.
 *
 * Los sonidos se sustituyen por WAV silenciosos mediante `customFolder`, así
 * que el test no hace ruido aunque reproduzca de verdad cada archivo.
 */

const vscode = require('vscode');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { FONT_SETS } = require('../../src/extension/fontsets');
const { installFonts, userFontsDir } = require('../../src/extension/font-installer');

const EXTENSION_ID = 'Normalxxnavi.bureau-theme';
const FILES = ['startup', 'theme', 'save', 'typing', 'typing-2', 'typing-3', 'error', 'clear', 'build-ok', 'build-fail', 'terminal-fail', 'debug', 'breakpoint', 'commit'];

const sleep = (/** @type {number} */ ms) => new Promise((r) => setTimeout(r, ms));

/** Espera hasta que `check()` sea verdadero o se agote el tiempo. */
async function waitFor(/** @type {() => boolean} */ check, /** @type {string} */ what, timeoutMs = 15000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (check()) return;
    await sleep(150);
  }
  throw new Error(`Tiempo agotado esperando: ${what}`);
}

function silentWav(/** @type {string} */ file) {
  const sr = 8000;
  const data = Buffer.alloc(sr * 0.05 * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(sr, 24);
  h.writeUInt32LE(sr * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, data]));
}

const errorCount = () => vscode.languages.getDiagnostics().reduce((n, [, d]) => n + d.filter((x) => x.severity === vscode.DiagnosticSeverity.Error).length, 0);

/** @param {string} name @param {number} code */
function runTask(name, code) {
  const folder = /** @type {vscode.WorkspaceFolder} */ (vscode.workspace.workspaceFolders?.[0]);
  // Un tipo propio: con 'shell' o 'process' VS Code la trataría como una
  // tarea de tasks.json y exigiría un "command" en la definición.
  const task = new vscode.Task({ type: 'bureau-integration', id: name }, folder, name, 'integration', new vscode.ShellExecution(`exit ${code}`));
  task.presentationOptions = { reveal: vscode.TaskRevealKind.Never };
  return new Promise((resolve, reject) => {
    const sub = vscode.tasks.onDidEndTaskProcess((e) => {
      if (e.execution.task.name === name) {
        sub.dispose();
        resolve(e.exitCode);
      }
    });
    vscode.tasks.executeTask(task).then(undefined, (err) => {
      sub.dispose();
      reject(err);
    });
  });
}

async function run() {
  const reportFile = process.env.BUREAU_INTEGRATION_REPORT || path.join(os.tmpdir(), 'bureau-integration.txt');
  /** @type {string[]} */
  const results = [];
  /** Escribe cada línea al momento: si algo se bloquea, se ve dónde. */
  const log = (/** @type {string} */ line) => {
    results.push(line);
    fs.appendFileSync(reportFile, line + '\n');
  };
  log(`Test de integración (VS Code ${vscode.version})`);

  /** Cada paso tiene su propio límite para que un fallo no bloquee el resto. */
  const step = async (/** @type {string} */ name, /** @type {() => Promise<void>} */ fn, timeoutMs = 45000) => {
    const t0 = Date.now();
    /** @type {NodeJS.Timeout | undefined} */
    let timer;
    try {
      await Promise.race([fn(), new Promise((_, reject) => (timer = setTimeout(() => reject(new Error('paso bloqueado')), timeoutMs)))]);
      log(`  ✔ ${name} (${Date.now() - t0} ms)`);
    } catch (err) {
      log(`  ✘ ${name}: ${/** @type {Error} */ (err).message}`);
    } finally {
      clearTimeout(timer);
    }
  };

  const ext = vscode.extensions.getExtension(EXTENSION_ID);
  assert.ok(ext, `No se encontró la extensión ${EXTENSION_ID}`);
  const api = await ext.activate();
  const history = () => /** @type {Array<{event: string, pack: string, source: string}>} */ (api.soundHistory);
  const played = (/** @type {string} */ event, /** @type {string} */ pack) => history().some((h) => h.event === event && (!pack || h.pack === pack));

  const silentDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bureau-silent-'));
  for (const f of FILES) silentWav(path.join(silentDir, `${f}.wav`));

  const sounds = vscode.workspace.getConfiguration('bureauTheme.sounds');
  const G = vscode.ConfigurationTarget.Global;
  const W = vscode.ConfigurationTarget.Workspace;
  const setTheme = (/** @type {string} */ label) => vscode.workspace.getConfiguration('workbench').update('colorTheme', label, W);

  await step('los sonidos están desactivados por defecto y sin listeners', async () => {
    assert.equal(sounds.get('enabled'), false);
    assert.equal(api.soundsStarted, false);
    // El icono de la Casa Inmemorial está visible por defecto.
    await waitFor(() => api.statusText === '$(bureau-house)', 'icono de la Casa Inmemorial visible');
  });

  await step('los cuatro temas están registrados', async () => {
    const labels = ext.packageJSON.contributes.themes.map((/** @type {any} */ t) => t.label);
    assert.deepEqual(labels, ['CONTROL Dark', 'CONTROL Black', 'CONTROL Resonant', 'CONTROL Astral']);
    assert.equal(vscode.window.activeColorTheme.kind, vscode.ColorThemeKind.Dark);
  });

  await step('tipografías: Bureau, «según el tema» y restaurar la tipografía anterior', async () => {
    const cfg = () => vscode.workspace.getConfiguration();
    const family = () => String(cfg().get('editor.fontFamily'));
    const before = cfg().inspect('editor.fontFamily')?.globalValue;
    // Este paso termina con «Quitar las tipografías instaladas», que actúa sobre
    // las fuentes reales del usuario: las que ya tenía se vuelven a instalar al final.
    const installedBefore = Object.values(FONT_SETS).filter((set) =>
      set.files.every((f) => fs.existsSync(path.join(userFontsDir(), `BureauTheme-${path.basename(f.file)}`)))
    );

    await cfg().update('bureauTheme.font', 'bureau', G);
    await waitFor(() => family().includes('Overpass Mono'), 'editor con Overpass Mono', 20000);
    await api.fontsIdle();
    // chat.fontFamily no existe en las versiones antiguas (la CI prueba también la mínima de engines).
    if (cfg().inspect('chat.fontFamily')?.defaultValue !== undefined) assert.match(String(cfg().get('chat.fontFamily')), /Overpass/);
    assert.match(String(cfg().get('terminal.integrated.fontFamily')), /Overpass Mono/);
    // Detrás va la fuente anterior: si se desinstala la extensión y se borran sus fuentes, VS Code vuelve a ella.
    const previous = String(before ?? cfg().inspect('editor.fontFamily')?.defaultValue);
    assert.ok(family().endsWith(previous.includes('monospace') ? previous : `${previous}, monospace`), `${family()} acaba en la fuente anterior`);
    // En la carpeta de fuentes del usuario de cada sistema (Windows, ~/Library/Fonts, ~/.local/share/fonts).
    assert.ok(fs.existsSync(path.join(userFontsDir(), 'BureauTheme-OverpassMono-Variable.ttf')), 'fuente instalada para el usuario');

    await cfg().update('bureauTheme.font', 'auto', G);
    await setTheme('CONTROL Resonant');
    await waitFor(() => family().includes('Space Mono'), 'según el tema: Resonant → Space Mono', 20000);
    await setTheme('CONTROL Dark');
    await waitFor(() => family().includes('Overpass Mono'), 'según el tema: Dark → Overpass Mono', 20000);

    await cfg().update('bureauTheme.font', 'none', G);
    await waitFor(() => cfg().inspect('editor.fontFamily')?.globalValue === before, 'tipografía original restaurada', 20000);
    await vscode.commands.executeCommand('bureauTheme.removeFonts');
    await api.fontsIdle();
    for (const set of installedBefore) installFonts(path.join(ext.extensionPath, 'fonts'), set.files);
  }, 90000);

  await step('terminal Bureau: el prompt se enciende, abre una terminal Bureau con la integración de shell y al apagarlo todo vuelve', async () => {
    const cfg = () => vscode.workspace.getConfiguration();
    const terminal = vscode.workspace.getConfiguration('bureauTheme.terminal');
    const profileKey = `terminal.integrated.defaultProfile.${process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux'}`;
    const profileBefore = cfg().inspect(profileKey)?.globalValue;
    const fontBefore = cfg().inspect('terminal.integrated.fontFamily')?.globalValue;

    await terminal.update('prompt', 'signage', G);
    await waitFor(() => api.terminalIdle() !== undefined, 'terminal Bureau cargada');
    await waitFor(() => cfg().inspect(profileKey)?.globalValue === 'Bureau', 'el perfil Bureau es el predeterminado', 20000);
    await api.terminalIdle();
    assert.match(String(cfg().get('terminal.integrated.fontFamily')), /'Bureau Prompt Icons'/);
    assert.ok(fs.existsSync(path.join(userFontsDir(), 'BureauTheme-BureauPromptIcons.ttf')), 'fuente de iconos instalada para el usuario');

    const options = api.bureauTerminalOptions();
    assert.ok(fs.existsSync(options.shellPath), `shell: ${options.shellPath}`);
    assert.match(fs.readFileSync(path.join(options.env.BUREAU_PROMPT_DIR, 'prompt.conf'), 'utf8'), /^style=signage$/m);
    // Las tareas siguen con el shell del sistema aunque el perfil Bureau sea el predeterminado.
    assert.equal(await runTask('bureau-terminal-ok', 0), 0);
    assert.equal(await runTask('bureau-terminal-fail', 3), 3);
    // Una terminal Bureau de verdad, con el prompt de dos líneas y Clasificado (el
    // redibujado al pulsar Enter): el prompt carga la integración de shell de
    // VS Code a mano, y VS Code recibe el resultado de cada comando.
    await terminal.update('prompt', 'dossier', G);
    await terminal.update('classified', true, G);
    await api.terminalIdle();
    const t = vscode.window.createTerminal(api.bureauTerminalOptions());
    try {
      await waitFor(() => t.shellIntegration !== undefined, 'integración de shell en la terminal Bureau', 30000);
      for (const command of ['echo bureau', 'echo control']) {
        const execution = /** @type {vscode.TerminalShellIntegration} */ (t.shellIntegration).executeCommand(command);
        const exitCode = await new Promise((resolve) => {
          const sub = vscode.window.onDidEndTerminalShellExecution((e) => {
            if (e.execution === execution) {
              sub.dispose();
              resolve(e.exitCode);
            }
          });
        });
        assert.equal(exitCode, 0, command);
      }
    } finally {
      t.dispose();
      await terminal.update('classified', undefined, G);
      await terminal.update('prompt', 'signage', G);
    }
    // Su menú y el de los estilos se abren y se cierran con Esc.
    for (const command of ['bureauTheme.terminalMenu', 'bureauTheme.chooseTerminalPrompt']) {
      const menu = vscode.commands.executeCommand(command);
      await sleep(800);
      await vscode.commands.executeCommand('workbench.action.closeQuickOpen');
      await menu;
    }
    assert.equal(cfg().get('bureauTheme.terminal.prompt'), 'signage', 'cerrar el menú no cambia nada');

    await terminal.update('prompt', 'off', G);
    await waitFor(() => cfg().inspect(profileKey)?.globalValue === profileBefore, 'vuelve el perfil predeterminado anterior', 20000);
    await api.terminalIdle();
    assert.equal(cfg().inspect('terminal.integrated.fontFamily')?.globalValue, fontBefore, 'la fuente de la terminal vuelve a estar como antes');
    assert.match(fs.readFileSync(path.join(options.env.BUREAU_PROMPT_DIR, 'prompt.conf'), 'utf8'), /^style=off$/m, 'las terminales abiertas devuelven tu prompt');
  }, 90000);

  await step('activar los sonidos registra los listeners', async () => {
    await sounds.update('customFolder', silentDir, G);
    await sounds.update('cooldownMs', 0, G);
    await sounds.update('volume', 40, G);
    await sounds.update('events.save', true, G);
    await sounds.update('events.terminalFail', true, G);
    await sounds.update('enabled', true, G);
    await waitFor(() => api.soundsStarted === true, 'controller.started');
  });

  await step('icono de la Casa Inmemorial: se puede ocultar y volver a mostrar', async () => {
    await vscode.commands.executeCommand('bureauTheme.toggleStatusBarItem');
    await waitFor(() => api.statusText === undefined, 'icono oculto');
    assert.equal(vscode.workspace.getConfiguration('bureauTheme').get('statusBarItem'), false);
    await vscode.commands.executeCommand('bureauTheme.toggleStatusBarItem');
    await waitFor(() => api.statusText === '$(bureau-house)', 'icono visible otra vez');
  });

  await step('cambiar a CONTROL Resonant → tema activado con el pack Resonant', async () => {
    await setTheme('CONTROL Resonant');
    await waitFor(() => played('themeActivated', 'resonant'), 'themeActivated/resonant');
    assert.ok(history().every((h) => h.source === 'custom'), 'debe usar la carpeta personalizada (silenciosa)');
  });

  await step('volver a CONTROL Dark → tema activado con el pack Control', async () => {
    await setTheme('CONTROL Dark');
    await waitFor(() => played('themeActivated', 'control'), 'themeActivated/control');
  });

  const folder = /** @type {vscode.WorkspaceFolder} */ (vscode.workspace.workspaceFolders?.[0]);
  const errorsUri = vscode.Uri.joinPath(folder.uri, 'errors.ts');
  const original = fs.readFileSync(errorsUri.fsPath, 'utf8');
  const doc = await vscode.workspace.openTextDocument(errorsUri);
  await vscode.window.showTextDocument(doc);

  await step('TypeScript publica los errores de errors.ts', async () => {
    await waitFor(() => errorCount() >= 3, 'diagnósticos de errors.ts', 30000);
    await sleep(2000); // la referencia de errores los absorbe en silencio (no ha habido ediciones)
    assert.ok(!played('newError', ''), 'abrir un archivo con errores no debe sonar');
  });

  /** @param {string} text */
  const replaceAndSave = async (text) => {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(errorsUri, new vscode.Range(0, 0, doc.lineCount, 0), text);
    await vscode.workspace.applyEdit(edit);
    await doc.save();
  };

  await step('corregir los errores y guardar → guardar + todo resuelto', async () => {
    await replaceAndSave("export const agent = { name: 'Jesse', clearance: 5 };\n");
    await waitFor(() => played('save', ''), 'save');
    await waitFor(() => played('allClear', ''), 'allClear', 15000);
  });

  await step('volver a introducir errores y guardar → errores nuevos', async () => {
    await replaceAndSave(original);
    await waitFor(() => played('newError', ''), 'newError', 15000);
  });

  await step('tarea correcta → build correcta', async () => {
    assert.equal(await runTask('ok', 0), 0);
    await waitFor(() => played('buildSuccess', ''), 'buildSuccess');
  });

  await step('tarea fallida → build fallida', async () => {
    assert.equal(await runTask('fail', 3), 3);
    await waitFor(() => played('buildFail', ''), 'buildFail');
  });

  await step('depurar javascript.js con un breakpoint → depuración + breakpoint', async () => {
    const js = vscode.Uri.joinPath(folder.uri, 'javascript.js');
    const line = fs.readFileSync(js.fsPath, 'utf8').split('\n').findIndex((l) => l.startsWith('const report'));
    vscode.debug.addBreakpoints([new vscode.SourceBreakpoint(new vscode.Location(js, new vscode.Position(line, 0)))]);
    await vscode.debug.startDebugging(folder, { type: 'node', request: 'launch', name: 'integration', program: js.fsPath, console: 'internalConsole' });
    await waitFor(() => played('debugStart', ''), 'debugStart', 30000);
    await waitFor(() => played('breakpoint', ''), 'breakpoint', 30000);
    await vscode.debug.stopDebugging();
    vscode.debug.removeBreakpoints(vscode.debug.breakpoints);
  });

  await step('commit de Git (repositorio temporal) → commit', async () => {
    const gitApi = (await vscode.extensions.getExtension('vscode.git')?.activate())?.getAPI(1);
    assert.ok(gitApi, 'API de Git no disponible');
    await waitFor(() => gitApi.repositories.length > 0, 'repositorio abierto por la extensión Git', 20000);
    await sleep(500); // el controlador se suscribe a onDidOpenRepository
    const repo = gitApi.repositories[0];
    fs.appendFileSync(vscode.Uri.joinPath(folder.uri, 'markdown.md').fsPath, '\nNota añadida por el test de integración.\n');
    await repo.status();
    await repo.commit('Commit del test de integración', { all: true });
    await waitFor(() => played('gitCommit', ''), 'gitCommit');
  });

  await step('comando de terminal fallido (shell integration) → terminal', async () => {
    // En Windows, Git Bash activa la shell integration de forma más fiable que
    // Windows PowerShell 5.1 en un perfil recién creado.
    const gitBash = 'C:\\Program Files\\Git\\bin\\bash.exe';
    const shellPath = process.platform === 'win32' && fs.existsSync(gitBash) ? gitBash : undefined;
    const terminal = vscode.window.createTerminal({ name: 'bureau-integration', shellPath });
    terminal.show(true);
    /** @type {vscode.TerminalShellIntegration | undefined} */
    let integration = terminal.shellIntegration;
    const end = Date.now() + 20000;
    while (!integration && Date.now() < end) {
      await sleep(250);
      integration = terminal.shellIntegration;
    }
    if (!integration) {
      log('    (omitido: la shell integration no se activó en esta terminal)');
      terminal.dispose();
      return;
    }
    integration.executeCommand('node -e "process.exit(4)"');
    await waitFor(() => played('terminalFail', ''), 'terminalFail', 20000);
    terminal.dispose();
  });

  await step('escribir en el editor → teclas, en el editor activo y sin saturar', async () => {
    await sleep(400);
    // Texto plano: un documento TypeScript a medio escribir dejaría errores que estorban a los pasos siguientes.
    const scratch = await vscode.workspace.openTextDocument({ language: 'plaintext', content: '' });
    const editor = await vscode.window.showTextDocument(scratch);
    const before = history().filter((h) => h.event === 'typing').length;
    for (const ch of 'const hotline = 1;') {
      await editor.edit((b) => b.insert(editor.selection.active, ch));
      await sleep(70);
    }
    await waitFor(() => history().filter((h) => h.event === 'typing').length - before >= 5, 'sonidos de teclas');
    const typed = history().filter((h) => h.event === 'typing').length - before;
    assert.ok(typed <= 18, `no más de una tecla por carácter (${typed})`);
    await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
  });

  await step('con un tema que no es CONTROL no suena nada', async () => {
    await setTheme('Default Dark Modern');
    await sleep(800);
    const before = history().length;
    await runTask('ok-other-theme', 0);
    await sleep(800);
    assert.equal(history().length, before);
  });

  await step('«Probar sonidos» suena aunque el tema no sea CONTROL', async () => {
    const before = history().length;
    await vscode.commands.executeCommand('bureauTheme.previewSounds');
    await sleep(300);
    await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem');
    await waitFor(() => history().length > before, 'sonido de prueba');
    await vscode.commands.executeCommand('workbench.action.closeQuickOpen');
  });

  await step('desactivar los sonidos elimina los listeners y deja de sonar', async () => {
    await setTheme('CONTROL Dark');
    await sounds.update('enabled', false, G);
    await waitFor(() => api.soundsStarted === false, 'controller.started = false');
    const before = history().length;
    await runTask('ok-disabled', 0);
    await sleep(800);
    assert.equal(history().length, before);
  });

  // --- Protocolos de la Agencia y guía de bienvenida ---------------------------
  const alertCfg = () => vscode.workspace.getConfiguration('bureauTheme.alertLevel');
  const classifiedCfg = () => vscode.workspace.getConfiguration('bureauTheme.classified');
  const boardCfg = () => vscode.workspace.getConfiguration('bureauTheme.board');

  await step('nivel de alerta: con los errores de errors.ts es Alerta, con umbral 1 es Incursión del Siseo', async () => {
    assert.equal(api.alertLevelText, undefined, 'apagado por defecto');
    await vscode.window.showTextDocument(doc);
    await waitFor(() => errorCount() >= 3, 'errores de errors.ts', 30000);
    await alertCfg().update('enabled', true, G);
    await waitFor(() => api.alertLevelText === '$(bureau-alert) ALERT', `nivel Alerta (${api.alertLevelText})`, 20000);
    await alertCfg().update('incursionThreshold', 1, G);
    await waitFor(() => api.alertLevelText === '$(bureau-alert) HISS INCURSION', `Incursión del Siseo (${api.alertLevelText})`);
    await alertCfg().update('enabled', false, G);
    await waitFor(() => api.alertLevelText === undefined, 'nivel de alerta oculto');
  });

  await step('Modo Clasificado: tapa los 8 valores de sample.env y el icono los revela', async () => {
    const editor = await vscode.window.showTextDocument(vscode.Uri.joinPath(folder.uri, 'languages', 'sample.env'));
    const key = editor.document.uri.toString();
    assert.equal(api.classifiedBars(key), 0, 'apagado por defecto');
    await classifiedCfg().update('enabled', true, G);
    await waitFor(() => api.classifiedBars(key) === 8, `8 barras (${api.classifiedBars(key)})`);
    // Un salto por comando (no con el teclado ni el ratón) no revela ninguna línea.
    editor.selection = new vscode.Selection(3, 0, 3, 0);
    await sleep(400);
    assert.equal(api.classifiedBars(key), 8);
    await vscode.commands.executeCommand('bureauTheme.declassify');
    await waitFor(() => api.classifiedBars(key) === 0, 'desclasificado');
    await vscode.commands.executeCommand('bureauTheme.declassify');
    await waitFor(() => api.classifiedBars(key) === 8, 'clasificado otra vez');
    await classifiedCfg().update('enabled', false, G);
    await waitFor(() => api.classifiedBars(key) === 0, 'barras quitadas al desactivarlo');
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
  });

  await step('Consejo: saluda una vez al día y comenta una tarea en la barra de estado', async () => {
    assert.deepEqual(api.boardComments, [], 'apagado por defecto');
    await boardCfg().update('comments', true, G);
    await waitFor(() => api.boardComments.some((/** @type {{moment: string}} */ c) => c.moment === 'startup' || c.moment === 'lateNight'), 'saludo del día', 10000);
    assert.equal(await runTask('board-ok', 0), 0);
    await waitFor(() => api.boardComments.some((/** @type {{moment: string}} */ c) => c.moment === 'buildOk'), 'comentario de la tarea');
    for (const c of api.boardComments) assert.match(c.text, /^<<[^<>]+>>$/);
    await boardCfg().update('comments', false, G);
  });

  await step('Consejo al azar: se activa y enseña un mensaje propio en la barra de estado', async () => {
    const mine = '<<PRUEBA DE INTEGRACIÓN, AGENTE.>>';
    await boardCfg().update('customMessages', [mine], G);
    await boardCfg().update('source', 'custom', G);
    await boardCfg().update('display', 'statusBar', G);
    await boardCfg().update('random', true, G);
    await waitFor(() => api.boardRandomStarted === true, 'mensajes al azar activados');
    api.boardRandomShowNow();
    await waitFor(() => api.boardRandomHistory.includes(mine), 'mensaje propio mostrado');
    await boardCfg().update('random', false, G);
    await waitFor(() => api.boardRandomStarted === false, 'mensajes al azar desactivados');
    for (const key of ['customMessages', 'source', 'display']) await boardCfg().update(key, undefined, G);
  });

  await step('gramola: se activa sin cuentas, su menú se abre y se cierra, y se apaga', async () => {
    // Solo lee lo que suena: nunca toca la reproducción de quien ejecuta el test.
    const music = vscode.workspace.getConfiguration('bureauTheme.music');
    await music.update('enabled', true, G);
    await waitFor(() => api.musicStarted === true, 'gramola en marcha');
    const menu = vscode.commands.executeCommand('bureauTheme.musicMenu');
    await sleep(800);
    await vscode.commands.executeCommand('workbench.action.closeQuickOpen');
    await menu;
    await music.update('enabled', false, G);
    await waitFor(() => api.musicStarted === false, 'gramola apagada');
  });

  await step('guía: el set completo aplica tema, iconos de archivo e iconos de producto', async () => {
    const cfg = () => vscode.workspace.getConfiguration();
    vscode.commands.executeCommand('bureauTheme.applyFullSet'); // espera a la notificación con «Deshacer»
    await sleep(600);
    await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem'); // CONTROL Dark
    await sleep(600);
    await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem'); // iconos a color
    await waitFor(() => cfg().get('workbench.productIconTheme') === 'bureau-product-icons-color', 'iconos de producto a color');
    assert.equal(cfg().get('workbench.iconTheme'), 'bureau-icons');
    assert.equal(cfg().inspect('workbench.colorTheme')?.globalValue, 'CONTROL Dark');
  });

  await step('guía: seguir el modo claro/oscuro del sistema con Astral de día', async () => {
    const cfg = () => vscode.workspace.getConfiguration();
    vscode.commands.executeCommand('bureauTheme.followSystem');
    await sleep(600);
    await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem'); // CONTROL Dark de noche
    await waitFor(() => cfg().get('window.autoDetectColorScheme') === true, 'detección del modo del sistema');
    assert.equal(cfg().get('workbench.preferredLightColorTheme'), 'CONTROL Astral');
    assert.equal(cfg().get('workbench.preferredDarkColorTheme'), 'CONTROL Dark');
    await cfg().update('window.autoDetectColorScheme', false, G);
  });

  await step('Casa Inmemorial: activa un protocolo, vuelve a la Casa y Esc la cierra', async () => {
    const panel = vscode.commands.executeCommand('bureauTheme.openOldestHouse');
    await sleep(600);
    // La primera opción es «Tema de color»; «Modo Clasificado» es la undécima (los
    // separadores no cuentan): 7 de apariencia (con la terminal Bureau), sonidos, gramola, bandas sonoras.
    for (let i = 0; i < 10; i++) await vscode.commands.executeCommand('workbench.action.quickOpenSelectNext');
    await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem');
    await waitFor(() => classifiedCfg().get('enabled') === true, 'Modo Clasificado activado desde el panel');
    await sleep(600); // el panel se vuelve a abrir solo
    await vscode.commands.executeCommand('workbench.action.closeQuickOpen');
    await panel; // con Esc el panel se cierra y el comando termina
    await classifiedCfg().update('enabled', false, G);
  });

  await step('guía: el comando abre la guía de bienvenida', async () => {
    await vscode.commands.executeCommand('bureauTheme.openWelcome');
    await waitFor(() => vscode.window.tabGroups.all.some((g) => g.tabs.some((t) => /welcome|bienvenid|bureau/i.test(t.label))), 'pestaña de la guía');
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
  });

  // Restaurar la copia temporal (no es el test-workspace real, pero por limpieza).
  fs.writeFileSync(errorsUri.fsPath, original);
  fs.rmSync(silentDir, { recursive: true, force: true });

  if (results.some((r) => r.includes('✘'))) throw new Error('Hay pasos fallidos');
}

module.exports = { run };
