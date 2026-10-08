# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [0.10.1] — 2026-10-08

### Fixed

- **Copilot icon**: its states (working, warning, error, done, unavailable, not connected, snoozed) and the agent icons fell back to VS Code's drawing; they now use Polaris with a mark for each state. Notifications in *Do Not Disturb* mode show the Hotline crossed out. 166 more icon variants are now covered (350 in total), and the product icon sheet in the README is updated.
- **Sounds you could not hear**: they were mastered at a low level (around -20 to -27 dBFS) and disappeared under background music. They are now mastered to a consistent loudness with a limiter (around -13 to -19 dBFS, peaks at -1 dBFS), and the default volume is 70.
- Audio player failures (PowerShell not starting or closing) are now reported as warnings in the *CONTROL Theme* log instead of failing silently.

### Added

- **Typing sound**: every key you type in the editor plays a soft Bureau typewriter key (*Control* pack) or a resonance tick (*Resonant* pack), with three variations. It never interrupts another sound and can be turned off in the sound console.

## [0.10.0] — 2026-10-08

### Added

- **Sound console**: a discreet *resonance* icon in the status bar opens a menu to turn sounds on, pick the pack, set the volume (with a sample), choose the events, preview sounds and set the advanced options — no `settings.json` needed. It can be hidden from the console, with **CONTROL: Show/Hide Sound Icon in Status Bar**, from the status bar context menu or with `bureauTheme.sounds.statusBarItem`.
- **New lore icons** (16 original glyphs): Polaris (Copilot and chat), the Ashtray Maze (Source Control), the teleporting rubber duck (Run and Debug), the floppy disk (Save), Ahti's tape (Timeline), the Benicoff TV (Debug Console), the slide projector (Output), the home safe (workspace trust), Ahti's mop (Clear all), the Oceanview Motel key (keys), the Oldest House (Home), the Threshold (Remote), the Aberrant from *CONTROL Resonant* (Tools), the Songmaster Jukebox (music) and the resonance (sound). 184 VS Code icons are now replaced.
- The extension registers its own icons, so the status bar and the console look the same with any product icon theme.

### Changed

- New name: **Bureau — CONTROL Fan Theme**, with a new description.
- **Bureau Product Icons (Color)** colours **every** icon: objects in their real colours and the interface in the Bureau's steel blue, with green, amber and red for go, caution and stop.
- The pyramid is no longer everywhere: it stays on the Git branch (and the Board on licences). The root folder is the Oldest House, `.git` carries the Ashtray Maze and AI files carry Polaris.
- The details page spreads the icons through the descriptions as small chips (they load over https), with a new *Objects of Power in your toolbar* table, instead of a block of badges at the top.

## [0.9.0] — 2026-10-08

### Added

- **Bureau Product Icons (Color)**: a second product icon theme with the game objects in their real colours — the red Hotline telephone, the cyan Hedron, the manila dossier, the brass FBC badge, the Board speaking in red, Hiss-red errors, amber warnings, a phosphor-green terminal prompt and coloured marks on the Git pyramid. It is a colour font (COLR/CPAL tables written by the project). The theme-colour version stays as it was.
- Badges on the details page (they load over https): fan emblems drawn with the project's own glyphs, and how the pack is built (JavaScript, Node.js, esbuild, Claude Code, no runtime dependencies, WCAG, MIT).
- A **How it's made** section in English and Spanish.

### Changed

- **Bureau Icons**: files go back to the 0.7 look — the label or pictogram in the colour of the language over the classification band, without the solid sheet — larger and aligned to whole pixels, so they stay sharp at 16 px. Folders keep their 0.8 design and all 340 extensions are still covered.
- **CONTROL Astral**: livelier code colours (keywords, types, strings, numbers, attributes…), clearly different from the black text. Code is now checked at WCAG AA (≥ 4.5:1); body text stays AAA (16.8:1).
- **Faster start-up**: the extension code is bundled with esbuild into a single 26 KB file; the sound engine, the font installer and the log channel are only loaded when needed, and the initial work runs after activation. Its own work at start-up went from 17 ms to 3 ms.
- The disclaimer uses the exact wording of Remedy's rules for fan content.

## [0.8.1] — 2026-10-07

### Changed

- New name: **Theme CONTROL**, with a shorter description.
- New extension icon: the Board as it appears in the Astral Plane — a matte black inverted pyramid floating in the white void (original artwork, no game assets).
- The details page is now bilingual — a complete English section and a complete Spanish section — with new professional screenshots: the four themes, Bureau Icons, Bureau Product Icons and the typography.
- The Git branch in the status bar keeps the inverted pyramid when the branch has uncommitted changes, staged changes or conflicts (with a small mark), and when creating or deleting branches.

## [0.8.0] — 2026-10-07

### Added

- **Bureau Product Icons** expanded from 27 to **160 VS Code icons** (97 glyphs): status bar (publish/sync, errors, warnings, remote indicator), panel toolbars (new, split, kill, maximize, close, more actions, tasks, terminal profiles), trees (chevrons, new file/folder, refresh, collapse all, filter), title bar (back/forward, layout toggles, window controls), debug toolbar, AI sparkles (the Board), packages (a cube) and more.
- **Bureau Icons** redesigned and expanded: files are solid Bureau dossiers with their code or a pictogram; folders are solid, coloured by category and carry an **emblem**. Now 498 icons covering 340 extensions, 284 well-known file names (tool configs, lockfiles, Docker, CI, .NET…), 84 languages and 278 folder names. AI instruction files (`CLAUDE.md`, `AGENTS.md`, `*.prompt.md`) carry the Board.

### Changed

- New extension icon: the Board's inverted pyramid with the FBC red slit and the Hedron line.
- New title and description; the author and publisher is **Normalxxnavi**.
- README rewritten as a complete details page.

## [0.7.0] — 2026-10-07

### Added

- **Bureau Product Icons**: a product icon theme that replaces VS Code's own icons — activity bar (explorer, search, source control, run and debug, extensions, accounts, settings), the Git branch in the status bar (the inverted pyramid), Copilot and Chat (the Board), notifications (the Hotline telephone), testing and terminal. Works with the activity bar on the side, on top or at the bottom.
- **Typography** inspired by the games (optional, offered on first start): *Bureau* (Overpass Mono / Overpass, derived from Highway Gothic like Interstate) and *Resonant* (Space Mono / Space Grotesk), or *Follow the theme*. Fonts (SIL OFL) are installed for the current user only; the previous font is restored on demand. Commands *CONTROL: Choose Typography…* and *CONTROL: Remove Installed Fonts*; setting `bureauTheme.font`.
- Accent glow on floating widgets and scrolled edges; accent current line number, active indent guide, bracket match and rulers; accent line under the tabs; darker line-number gutter.

### Changed

- **CONTROL Black** has its own identity: the *Astral Plane in negative*, with signage lines, cursor and glows in astral white and FBC red kept for selection and details.
- **CONTROL Astral** is easier to read: darker, more saturated text and syntax colours (body text 16.8:1, code ≥ 7:1, comments 6.75:1), checked with stricter AAA targets.

### Removed

- The status bar location indicator (`▼ THE OLDEST HOUSE`…) and its setting.

## [0.6.0] — 2026-10-06

### Added

- **CONTROL Astral**, a light theme inspired by the Astral Plane: a white void framed by black geometry, with red only for details.
- **Bureau Icons** file icon theme: dossier-style labels and pictograms with a classification band, concrete folders with coloured tabs, dark and light variants. Lore details: redacted `.env` files, Hedron hexagon for tests, the Board's pyramid as root folder.
- Status bar **location** indicator (removed in 0.7.0).

### Changed

- Redesigned frame (Bureau signage): a dark *monolith* for the activity bar, status bar and title bar; sidebar titles as monolith bands with an accent line; accent rules between sections; accent indent guides; "astral light" for active frame elements; accent line on top of the status bar.
- Chat panels: elevated request bubbles, accent-framed code blocks, monolith avatars and themed session indicators.
- Floating widgets (Command Palette, notifications) get a thin accent frame.

## [0.5.0] — 2026-10-06

First functional version (still in development: pending several days of real use before 1.0.0).

### Added

- **CONTROL Dark** (*Control* — The Oldest House), **CONTROL Black** (OLED) and **CONTROL Resonant** (*Control Resonant* — patterned Manhattan) color themes.
- 655 workbench colors (including the *modern UI* tab keys of VS Code 1.140), TextMate rules and semantic token colors (including C#/Roslyn and Razor), 16 terminal ANSI colors and bracket pair colors.
- Contrast checks (WCAG) and the Resonant rule "red belongs to the Hiss", verified automatically.
- **Optional sounds**, off by default: 11 events (startup, theme switch, save, new errors, all errors fixed, task success/failure, terminal failure, debugging, breakpoint, Git commit) with one switch each.
- Two original sound packs, *Control* and *Resonant*, synthesized from scratch. The `auto` mode picks the pack that matches the active theme.
- Volume, cooldown with priorities, error check on save or live, and a custom sounds folder.
- Commands: *CONTROL: Toggle Sounds*, *CONTROL: Preview Sounds…*, *CONTROL: Open Sound Settings*.
- English and Spanish translations.
