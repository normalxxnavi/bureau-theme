// @ts-check
'use strict';

/**
 * La gramola Songmaster (el Objeto de Poder que pone música en la Casa): lo
 * que suena en el ordenador, con cualquier reproductor, en la barra de estado,
 * con play/pausa, siguiente y anterior, y enlaces a las bandas sonoras
 * oficiales de CONTROL y CONTROL Resonant. Se activa con
 * `bureauTheme.music.enabled` y lee la música del propio sistema
 * (music-source.js): sin cuentas ni internet.
 *
 * Pregunta al sistema cada 3 s, también con VS Code en segundo plano: la
 * canción cambia mientras trabajas en otra aplicación, y al volver la barra de
 * estado ya la tiene. Al volver a la ventana, además, lee al momento.
 */

const vscode = require('vscode');
const parse = require('./music-parse');
const H = require('./hover');
const { logoUri } = require('./player-logos');
const { MUSIC } = require('./config');

const Global = vscode.ConfigurationTarget.Global;
const POLL_MS = 3000;
/** Largo máximo del título, el artista y el álbum en el popup. */
const POPUP_TEXT = 120;
/** Comandos que se pueden pulsar desde el popup. */
const POPUP_COMMANDS = ['bureauTheme.musicPrevious', 'bureauTheme.musicPlayPause', 'bureauTheme.musicNext'];
/** @returns {{enabled: boolean, onlySpotify: boolean, controls: boolean}} */
function readMusicConfig() {
  const c = vscode.workspace.getConfiguration(MUSIC);
  return { enabled: c.get('enabled') === true, onlySpotify: c.get('source') === 'spotify', controls: c.get('controls') !== false };
}

/**
 * Abre una banda sonora en Spotify: en la app si es la que suena, y si no en la web.
 * @param {string} id @param {boolean} [inApp]
 */
async function openSoundtrack(id, inApp = false) {
  const s = parse.SOUNDTRACKS.find((t) => t.id === id);
  if (!s) return;
  await vscode.env.openExternal(vscode.Uri.parse(parse.soundtrackUri(s.spotify, inApp)));
}

/** Elige una banda sonora y la abre. @param {boolean} [inApp] */
async function chooseSoundtrack(inApp = false) {
  const choice = await vscode.window.showQuickPick(
    parse.SOUNDTRACKS.map((s) => ({ label: `$(bureau-jukebox) ${s.name}`, description: s.artist, id: s.id })),
    { title: vscode.l10n.t('Official soundtracks'), placeHolder: vscode.l10n.t('Opens the album in Spotify (links only: no music is included)') }
  );
  if (choice) await openSoundtrack(choice.id, inApp);
}

class Jukebox {
  /** @param {vscode.ExtensionContext} context */
  constructor(context) {
    this.context = context;
    this.started = false;
    this.onlySpotify = false;
    /** @type {import('./music-source').MusicSource | null} */
    this.source = null;
    /** @type {import('./music-parse').Track | null} */
    this.track = null;
    /** @type {Record<'title' | 'previous' | 'playPause' | 'next', vscode.StatusBarItem> | null} */
    this.items = null;
    /** @type {NodeJS.Timeout | undefined} */
    this.timer = undefined;
    /** @type {vscode.Disposable | undefined} */
    this.focusListener = undefined;
    this.warned = false;
    /** Portada de la canción actual (`data:`), si el sistema la da. @type {string | null} */
    this.cover = null;
    /** Canción a la que corresponde la portada. */
    this.coverFor = '';
    /** Lo que muestra ahora el popup (para no rehacerlo si no cambia). */
    this.popupKey = '';
    /** Hay una lectura en curso, y otra pedida mientras tanto. */
    this.reading = false;
    this.readAgain = false;
  }

  init() {
    this.context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration(MUSIC)) this.refresh();
      }),
      { dispose: () => this.stop() }
    );
    this.refresh();
  }

  refresh() {
    const cfg = readMusicConfig();
    if (!cfg.enabled || (this.started && cfg.onlySpotify !== this.onlySpotify)) this.stop();
    if (!cfg.enabled) return;
    if (!this.started) this.start(cfg.onlySpotify);
    this.render();
  }

  /** @param {boolean} onlySpotify */
  start(onlySpotify) {
    this.started = true;
    this.onlySpotify = onlySpotify;
    this.source = require('./music-source').createMusicSource({ onlySpotify });
    if (!this.source.available && !this.warned) {
      this.warned = true;
      vscode.window.showWarningMessage(
        process.platform === 'linux'
          ? vscode.l10n.t('Songmaster jukebox: "gdbus" was not found, so the music cannot be read on this system.')
          : vscode.l10n.t('Songmaster jukebox: Spotify and Music are not installed, so the music cannot be read on this system.')
      );
    }
    const make = (/** @type {string} */ id, /** @type {number} */ priority, /** @type {string} */ name, /** @type {string} */ command) => {
      const item = vscode.window.createStatusBarItem(id, vscode.StatusBarAlignment.Right, priority);
      item.name = name;
      item.command = command;
      return item;
    };
    // A la izquierda de la Casa Inmemorial (prioridad -100).
    this.items = {
      title: make('bureauTheme.music', -96, vscode.l10n.t('Songmaster Jukebox'), 'bureauTheme.musicMenu'),
      previous: make('bureauTheme.musicPrevious', -97, vscode.l10n.t('Previous'), 'bureauTheme.musicPrevious'),
      playPause: make('bureauTheme.musicPlayPause', -98, vscode.l10n.t('Play/Pause'), 'bureauTheme.musicPlayPause'),
      next: make('bureauTheme.musicNext', -99, vscode.l10n.t('Next'), 'bureauTheme.musicNext'),
    };
    this.focusListener = vscode.window.onDidChangeWindowState((state) => {
      if (state.focused) this.poll();
    });
    this.poll();
  }

  stop() {
    this.started = false;
    this.readAgain = false;
    clearTimeout(this.timer);
    this.focusListener?.dispose();
    this.focusListener = undefined;
    this.source?.dispose();
    this.source = null;
    if (this.items) for (const item of Object.values(this.items)) item.dispose();
    this.items = null;
    this.track = null;
    this.cover = null;
    this.coverFor = '';
    this.popupKey = '';
  }

  /**
   * Lee lo que suena y programa la siguiente lectura. Una sola a la vez: si
   * llega otra petición (volver a la ventana, un control) mientras lee, se
   * vuelve a leer al terminar. Sin esto, cada lectura solapada dejaba su
   * propio temporizador y las lecturas se iban multiplicando.
   */
  async poll() {
    clearTimeout(this.timer);
    if (!this.started || !this.source) return;
    if (this.reading) {
      this.readAgain = true;
      return;
    }
    this.reading = true;
    const source = this.source;
    try {
      const track = await source.read().catch(() => null);
      // Apagada (o cambiada de fuente) mientras leía: esta lectura ya no cuenta.
      if (this.started && this.source === source) {
        this.track = track;
        this.loadCover();
        this.render();
      }
    } finally {
      this.reading = false;
    }
    if (!this.started) return;
    if (this.readAgain) {
      this.readAgain = false;
      this.poll();
      return;
    }
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.poll(), POLL_MS);
  }

  /** Pide la portada cuando cambia la canción (solo local: nunca se descarga nada). */
  loadCover() {
    const t = this.track;
    const key = t ? [t.app, t.title, t.artist, t.album].join('|') : '';
    if (key === this.coverFor) return;
    this.coverFor = key;
    this.cover = null;
    if (!t || !this.source) return;
    this.source
      .cover()
      .then((cover) => {
        if (this.coverFor !== key) return;
        this.cover = cover;
        this.render();
      })
      .catch(() => {});
  }

  /**
   * El popup: la portada (o la gramola) a la izquierda, la canción a la
   * derecha con el logotipo del reproductor y, debajo, los controles, que se
   * pueden pulsar.
   * @param {import('./music-parse').Track} t
   */
  popup(t) {
    const playing = t.playing;
    const jukebox = H.hoverImage(this.context.extensionPath, 'jukebox');
    // El reproductor, con su logotipo (o su nombre, si no hay): si suena o no ya lo dice el botón de pausa.
    const name = parse.appName(t.app);
    const logo = logoUri(parse.appLogo(t.app));
    const md = H.card({
      image: this.cover ?? jukebox,
      fallbackImage: jukebox,
      imageSize: 80,
      title: parse.clip(t.title, POPUP_TEXT),
      lines: [
        t.artist ? H.escapeHtml(parse.clip(t.artist, POPUP_TEXT)) : '',
        t.album ? `<i>${H.escapeHtml(parse.clip(t.album, POPUP_TEXT))}</i>` : '',
        logo ? H.inlineImage(logo, 16, name) : H.pill(name.toUpperCase(), H.NEUTRAL.background, H.NEUTRAL.color),
      ].filter(Boolean),
      rows: [
        [
          H.button('chevron-left', vscode.l10n.t('Previous'), 'bureauTheme.musicPrevious'),
          H.button(playing ? 'debug-pause' : 'play', playing ? vscode.l10n.t('Pause') : vscode.l10n.t('Play'), 'bureauTheme.musicPlayPause'),
          H.button('chevron-right', vscode.l10n.t('Next'), 'bureauTheme.musicNext'),
        ],
      ],
    });
    const tooltip = new vscode.MarkdownString(md, true);
    tooltip.supportHtml = true;
    tooltip.isTrusted = { enabledCommands: POPUP_COMMANDS };
    return tooltip;
  }

  render() {
    if (!this.items) return;
    const t = this.track;
    const { title, previous, playPause, next } = this.items;
    if (!t) {
      for (const item of [title, previous, playPause, next]) H.setItem(item, { visible: false });
      return;
    }
    // Se lee cada 3 s: solo se toca lo que cambia, o el popup parpadea mientras lo miras.
    const key = [t.app, t.title, t.artist, t.album, t.playing, this.cover?.length ?? 0].join('|');
    if (key !== this.popupKey) {
      this.popupKey = key;
      H.setItem(title, { tooltip: this.popup(t) });
    }
    H.setItem(title, {
      text: `$(bureau-jukebox) ${parse.statusText(t)}`,
      accessibilityInformation: { label: `${vscode.l10n.t('Songmaster Jukebox')}: ${[t.title, t.artist].filter(Boolean).join(', ')}`, role: 'button' },
      visible: true,
    });
    const controls = readMusicConfig().controls;
    H.setItem(previous, { text: '$(chevron-left)', tooltip: vscode.l10n.t('Previous'), visible: controls });
    H.setItem(playPause, { text: t.playing ? '$(debug-pause)' : '$(play)', tooltip: t.playing ? vscode.l10n.t('Pause') : vscode.l10n.t('Play'), visible: controls });
    H.setItem(next, { text: '$(chevron-right)', tooltip: vscode.l10n.t('Next'), visible: controls });
  }

  /** @param {import('./music-source').MusicCommand} c */
  async command(c) {
    if (!this.source) return;
    await this.source.command(c);
    // Los reproductores tardan un momento en cambiar de canción.
    setTimeout(() => this.poll(), 400);
  }
}

/**
 * El menú de la gramola (desde su canción en la barra de estado, la Casa
 * Inmemorial o «CONTROL: Abrir la gramola Songmaster…»).
 * @param {Jukebox | undefined} jukebox
 */
async function openMusicMenu(jukebox) {
  for (;;) {
    const cfg = readMusicConfig();
    const t = jukebox?.started ? jukebox.track : null;
    /** @type {Array<vscode.QuickPickItem & {action?: string, id?: string}>} */
    const items = [];
    if (!cfg.enabled) {
      items.push({
        label: `$(bureau-jukebox) ${vscode.l10n.t('Turn on the jukebox')}`,
        detail: vscode.l10n.t('Shows what is playing (Spotify or any player) in the status bar, with controls. No account, nothing leaves your computer.'),
        action: 'enable',
      });
    } else if (t) {
      items.push(
        { label: `$(bureau-jukebox) ${parse.noIcons(t.title)}`, description: parse.noIcons([t.artist, parse.appName(t.app)].filter(Boolean).join(' · ')), detail: parse.noIcons(t.album) || undefined, action: 'playPause' },
        { label: t.playing ? `$(debug-pause) ${vscode.l10n.t('Pause')}` : `$(play) ${vscode.l10n.t('Play')}`, action: 'playPause' },
        { label: `$(chevron-right) ${vscode.l10n.t('Next')}`, action: 'next' },
        { label: `$(chevron-left) ${vscode.l10n.t('Previous')}`, action: 'previous' }
      );
    } else {
      items.push({ label: `$(bureau-jukebox) ${vscode.l10n.t('Nothing is playing')}`, detail: vscode.l10n.t('Play something in Spotify or any other player.') });
    }
    items.push({ label: vscode.l10n.t('Official soundtracks'), kind: vscode.QuickPickItemKind.Separator });
    for (const s of parse.SOUNDTRACKS) items.push({ label: `$(bureau-cassette) ${s.name}`, description: s.artist, action: 'soundtrack', id: s.id });
    if (cfg.enabled) {
      items.push(
        { label: vscode.l10n.t('Settings'), kind: vscode.QuickPickItemKind.Separator },
        { label: `$(bureau-hexnut) ${vscode.l10n.t('Players')}`, description: cfg.onlySpotify ? vscode.l10n.t('Only Spotify') : vscode.l10n.t('Any player'), action: 'source' },
        { label: `$(bureau-hexnut) ${vscode.l10n.t('Controls in the status bar')}`, description: cfg.controls ? vscode.l10n.t('Yes') : vscode.l10n.t('No'), action: 'controls' },
        { label: `$(close) ${vscode.l10n.t('Turn off the jukebox')}`, action: 'disable' }
      );
    }
    const choice = await vscode.window.showQuickPick(items, {
      title: vscode.l10n.t('CONTROL — Songmaster Jukebox'),
      placeHolder: vscode.l10n.t('What is playing, and the music of the Oldest House'),
    });
    if (!choice?.action) return;
    const c = vscode.workspace.getConfiguration(MUSIC);
    switch (choice.action) {
      case 'enable':
        await c.update('enabled', true, Global);
        return;
      case 'disable':
        await c.update('enabled', false, Global);
        return;
      case 'playPause':
      case 'next':
      case 'previous':
        await jukebox?.command(/** @type {import('./music-source').MusicCommand} */ (choice.action));
        return;
      case 'soundtrack':
        await openSoundtrack(String(choice.id), Boolean(t && parse.isSpotify(t.app)));
        return;
      case 'source':
        await c.update('source', cfg.onlySpotify ? 'any' : 'spotify', Global);
        break;
      case 'controls':
        await c.update('controls', !cfg.controls, Global);
        break;
    }
  }
}

module.exports = { Jukebox, openMusicMenu, openSoundtrack, chooseSoundtrack, readMusicConfig };
