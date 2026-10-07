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

const EXTENSION_ID = 'JaviHexer.bureau-theme';
const FILES = ['startup', 'theme', 'save', 'error', 'clear', 'build-ok', 'build-fail', 'terminal-fail', 'debug', 'breakpoint', 'commit'];

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

    await cfg().update('bureauTheme.font', 'bureau', G);
    await waitFor(() => family().includes('Overpass Mono'), 'editor con Overpass Mono', 20000);
    await api.fontsIdle();
    assert.match(String(cfg().get('chat.fontFamily')), /Overpass/);
    assert.match(String(cfg().get('terminal.integrated.fontFamily')), /Overpass Mono/);
    if (process.platform === 'win32') {
      const dir = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Windows', 'Fonts');
      assert.ok(fs.existsSync(path.join(dir, 'BureauTheme-OverpassMono-Variable.ttf')), 'fuente instalada para el usuario');
    }

    await cfg().update('bureauTheme.font', 'auto', G);
    await setTheme('CONTROL Resonant');
    await waitFor(() => family().includes('Space Mono'), 'según el tema: Resonant → Space Mono', 20000);
    await setTheme('CONTROL Dark');
    await waitFor(() => family().includes('Overpass Mono'), 'según el tema: Dark → Overpass Mono', 20000);

    await cfg().update('bureauTheme.font', 'none', G);
    await waitFor(() => cfg().inspect('editor.fontFamily')?.globalValue === before, 'tipografía original restaurada', 20000);
    await vscode.commands.executeCommand('bureauTheme.removeFonts');
    await api.fontsIdle();
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

  // Restaurar la copia temporal (no es el test-workspace real, pero por limpieza).
  fs.writeFileSync(errorsUri.fsPath, original);
  fs.rmSync(silentDir, { recursive: true, force: true });

  if (results.some((r) => r.includes('✘'))) throw new Error('Hay pasos fallidos');
}

module.exports = { run };
