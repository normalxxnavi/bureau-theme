// @ts-check
'use strict';

/**
 * Manejar una ventana de VS Code por el protocolo de depuración de Chromium
 * (VS Code arrancado con --remote-debugging-port): poner el ratón sobre un
 * elemento de la barra de estado para que salga su popup, y hacer capturas de
 * la ventana. El ratón es virtual: el del usuario no se mueve.
 *
 * Lo usan las capturas del README (shots.js) y la prueba de los popups en
 * Windows, macOS y Linux (scripts/popup-check.js).
 */

const fs = require('node:fs');

/** @param {number} ms */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Lo más que se espera la respuesta a una orden del protocolo de depuración. */
const SEND_TIMEOUT_MS = 20000;

/**
 * Se conecta a la ventana principal de VS Code (la página del workbench).
 * @param {number} port
 * @param {number} [timeoutMs]
 */
async function connect(port, timeoutMs = 60000) {
  const until = Date.now() + timeoutMs;
  /** @type {any} */
  let page;
  while (!page) {
    try {
      const list = /** @type {any[]} */ (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json());
      page = list.find((/** @type {any} */ t) => t.type === 'page' && /workbench/.test(t.url));
    } catch {
      // VS Code todavía no escucha
    }
    if (!page) {
      if (Date.now() > until) throw new Error(`No hay ventana de VS Code en el puerto ${port}`);
      await sleep(500);
    }
  }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  let id = 0;
  /** @type {Map<number, {resolve: (v: any) => void, reject: (e: Error) => void}>} */
  const pending = new Map();
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(String(e.data));
    const p = pending.get(msg.id);
    if (!p) return;
    pending.delete(msg.id);
    if (msg.error) p.reject(new Error(msg.error.message));
    else p.resolve(msg.result);
  });
  /**
   * Cada orden tiene su límite: si la ventana deja de pintar (en macOS, una
   * ventana tapada o sin pantalla), Chromium no contesta a las capturas ni al
   * ratón, y sin límite el proceso se quedaría esperando para siempre.
   * @param {string} method @param {object} [params] @returns {Promise<any>}
   */
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const n = ++id;
      const timer = setTimeout(() => {
        pending.delete(n);
        reject(new Error(`${method}: VS Code no contesta en ${SEND_TIMEOUT_MS / 1000} s`));
      }, SEND_TIMEOUT_MS);
      pending.set(n, {
        resolve: (v) => (clearTimeout(timer), resolve(v)),
        reject: (e) => (clearTimeout(timer), reject(e)),
      });
      ws.send(JSON.stringify({ id: n, method, params }));
    });

  /** @param {string} expression */
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true })).result.value;

  /**
   * Centro del elemento de la barra de estado cuyo id acaba en `id` (VS Code
   * le pone delante el id de la extensión), o null si no está o no se ve.
   * @param {string} id
   * @returns {Promise<[number, number] | null>}
   */
  const statusItem = (id) =>
    evaluate(`(() => {
      const e = [...document.querySelectorAll('.statusbar-item')].find((e) => e.id.endsWith(${JSON.stringify(id)}) && e.offsetWidth > 0);
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return [Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)];
    })()`);

  /**
   * El popup abierto: su texto (vacío si no hay ninguno) y cuántas de sus
   * imágenes han cargado.
   * @returns {Promise<{text: string, images: number, loaded: number}>}
   */
  const popup = () =>
    evaluate(`(() => {
      const hover = [...document.querySelectorAll('.workbench-hover, .monaco-hover:not(.hidden)')].find((e) => e.offsetWidth > 0 && e.innerText.trim());
      const images = hover ? [...hover.querySelectorAll('img')] : [];
      return { text: hover ? hover.innerText : '', images: images.length, loaded: images.filter((i) => i.complete && i.naturalWidth > 0).length };
    })()`);

  return {
    evaluate,
    statusItem,
    popup,
    /**
     * Pulsa una tecla en la ventana, como si fuera el teclado (el editor lo
     * ve como un movimiento del usuario).
     * @param {'ArrowDown' | 'ArrowUp' | 'Enter' | 'Escape' | 'F1'} key
     */
    async press(key) {
      const code = { ArrowDown: 40, ArrowUp: 38, Enter: 13, Escape: 27, F1: 112 }[key];
      for (const type of ['rawKeyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key, code: key, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code });
      await sleep(300);
    },
    /** Escribe texto donde esté el foco (la paleta de comandos, el editor…). @param {string} text */
    async type(text) {
      await send('Input.insertText', { text });
      await sleep(300);
    },
    /**
     * Espera a que se vea el elemento de la barra de estado y pone el ratón
     * encima; espera también a que salga el popup.
     * @param {string} id @param {number} [timeoutMs]
     */
    async hoverStatusItem(id, timeoutMs = 30000) {
      const until = Date.now() + timeoutMs;
      let at = await statusItem(id);
      while (!at) {
        if (Date.now() > until) throw new Error(`No aparece ${id} en la barra de estado`);
        await sleep(500);
        at = await statusItem(id);
      }
      // Primero lejos de la barra de estado, hasta que no quede ningún popup abierto (el de antes).
      const visible = async () => Boolean((await popup()).text.trim());
      const [w, h] = await evaluate('[innerWidth, innerHeight]');
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(w / 2), y: Math.round(h / 2) });
      for (let i = 0; i < 20 && (await visible()); i++) await sleep(250);
      for (const dx of [-30, 0]) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at[0] + dx, y: at[1] });
      const shown = Date.now() + 10000;
      while (!(await visible())) {
        if (Date.now() > shown) throw new Error(`No sale el popup de ${id}`);
        await sleep(250);
      }
      await sleep(1200); // imágenes del popup
    },
    /** Captura de la ventana (solo el contenido, sin el marco del sistema). @param {string} file */
    async screenshot(file) {
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(file, Buffer.from(data, 'base64'));
    },
    close: () => ws.close(),
  };
}

module.exports = { connect };
