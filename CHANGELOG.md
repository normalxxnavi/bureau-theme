# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

**Beta.** During the beta the version is **0.*day*.*build***: the minor number counts the days of development (day 1 = 2026-10-06; only days with changes count) and the patch number counts the builds of that day. Version 1.0.0 will be the first stable release. (The earliest builds, never published, were numbered 0.5.0–0.10.1; they are listed here with their new numbers.)

## [Unreleased]

### Changed

- **Sharp icons on displays at 100 % scaling.** Every file icon and product icon has been redrawn on the pixel grid: VS Code draws them at 16 px (24 px in the activity bar), and the old shapes fell between pixels, so they looked blurry or pixelated on large monitors. Horizontal and vertical edges now land on whole pixels (checked by a new test on all 625 icons).
- **Bureau Icons**: file labels use new 6 × 10 px letters drawn for the theme instead of 8.8 px system text — larger, bolder and identical on every system. Pictograms and folder emblems are redrawn; emblems are real cut-outs (transparent), and the API, AI and CI folders have clearer emblems. `.svg` files get a vector pictogram, LaTeX files read `TE` and Podfiles `PO`.
- **Bureau Product Icons**: 127 glyphs on a 16 px grid with 2 px strokes, plus their own 24 px drawings for the activity bar (Explorer, Search, Source Control, Run and Debug, Extensions, Testing, Accounts, Manage and Remote). The font is smaller (6 KB).
- **Details page**: plain screenshots of real VS Code windows — just the editor with the theme, no captions, frames, badges or sample terminal output — under new file names, so the old composed images can never show up from GitHub's cache. Shorter README. The Marketplace description now starts with what people search for (dark, OLED black and light themes, file and product icons) and the keywords were reviewed (26 + the 4 tags VS Code adds, within the Marketplace limit of 30).
- **Two branches and releases with manual approval**: `develop` for development and `release` for production. A `vX.Y.Z` tag on `release` only builds the `.vsix`; the release job waits for the maintainer's approval and creates a **draft** that must be published by hand. Pushing commits never creates a release.

### Security

- **Restricted Mode**: in untrusted workspaces the sound settings of the workspace are ignored, so a cloned repository cannot turn sounds on through `.vscode/settings.json`.
- Relative `PATH` entries are ignored when looking for the audio player and `fc-cache`; `fc-cache` is started with its absolute path.
- Network paths (`\\server\share`) are rejected for the custom sounds folder, and the Windows player only accepts file paths (it would also download URLs); folders, pipes and devices named like a sound are ignored; malformed WAV headers are rejected before reading samples.
- Supply chain: GitHub Actions pinned to commit SHAs, `npm audit` and `npm audit signatures` in CI, CodeQL scanning, Dependabot waits 7 days before proposing a new version, install scripts disabled locally (`.npmrc`), and releases are built read-only and published with a SHA-256 checksum and a build provenance attestation. See [SECURITY.md](SECURITY.md).

### Fixed

- Updated fonts are copied again when their content changes (before, only the size was compared).
- An error in the first-run typography offer no longer leaves an unhandled promise; a failed read no longer leaves a sound file open.

## [0.5.0] — 2026-10-13

### Security

- The Windows sound player no longer starts PowerShell with `-ExecutionPolicy Bypass`: it only runs an encoded command, which doesn't need it.
- Sound files larger than 16 MB are rejected before being read.
- Development tools updated: `@vscode/vsce` 4.0.0 fixes 6 high-severity advisories in its dependencies (`npm audit`: 0 vulnerabilities). None of them ship inside the extension.
- New [`SECURITY.md`](SECURITY.md): exactly what the extension does on your computer and how to report a vulnerability privately. The README now has a *Privacy and security* section.

### Added

- Continuous integration on Windows, macOS and Linux: build, type check, contrast, key validation, unit tests, generated files up to date and packaging, plus the integration tests against a real VS Code. Releases are created from `vX.Y.Z` tags with their notes taken from this changelog. Dependabot keeps dependencies and actions up to date.
- [`CONTRIBUTING.md`](CONTRIBUTING.md), issue and pull request templates.
- `npm run screenshots` regenerates the README images and a GitHub social preview from a clean install; `npm run generate` regenerates every other generated file; `npm run download-vscode` fetches a VS Code for the integration tests.

### Changed

- The whole codebase is type checked (`npm run typecheck`, part of `npm run check`).
- The product icon fonts are generated deterministically, so regenerating them no longer changes the files.

## [0.4.0] — 2026-10-09

### Changed

- **Versioning by day during the beta**: 0.*day*.*build* (day 1 = 2026-10-06). The earlier builds are renumbered (0.5.0–0.10.1 → 0.1.0–0.3.2). The extension is marked as *Preview* until 1.0.0.
- Spanish texts use **Siseo**, the official Spanish name of the Hiss.

### Performance

- **Sounds play in about 2 ms instead of 140 ms**: the Windows player no longer calls `Stop()` before each sound (it waited for the audio device to close), and it keeps every sound loaded in memory. Fast typing no longer queues key sounds.
- Typing sounds no longer touch the disk on each key: file paths, scaled volume and the active theme pack are cached until the settings or the theme change.
- The start-up bundle drops from 14 KB to 5 KB: the typography module is now a separate file that only loads when there is something to do (first-run offer, *follow the theme* mode or a pending change).
- Lighter files that VS Code reads to draw the window: the file icon theme goes from 192 KB to 65 KB (compact JSON, short internal ids and no duplicated high-contrast section), the colour themes from 52 KB to 42 KB and the product icon themes from 22 KB to 15 KB.

## [0.3.2] — 2026-10-08

### Fixed

- **Copilot icon**: its states (working, warning, error, done, unavailable, not connected, snoozed) and the agent icons fell back to VS Code's drawing; they now use Polaris with a mark for each state. Notifications in *Do Not Disturb* mode show the Hotline crossed out. 166 more icon variants are now covered (350 in total), and the product icon sheet in the README is updated.
- **Sounds you could not hear**: they were mastered at a low level (around -20 to -27 dBFS) and disappeared under background music. They are now mastered to a consistent loudness with a limiter (around -13 to -19 dBFS, peaks at -1 dBFS), and the default volume is 70.
- Audio player failures (PowerShell not starting or closing) are now reported as warnings in the *CONTROL Theme* log instead of failing silently.

### Added

- **Typing sound**: every key you type in the editor plays a soft Bureau typewriter key (*Control* pack) or a resonance tick (*Resonant* pack), with three variations. It never interrupts another sound and can be turned off in the sound console.

## [0.3.1] — 2026-10-08

### Added

- **Sound console**: a discreet *resonance* icon in the status bar opens a menu to turn sounds on, pick the pack, set the volume (with a sample), choose the events, preview sounds and set the advanced options — no `settings.json` needed. It can be hidden from the console, with **CONTROL: Show/Hide Sound Icon in Status Bar**, from the status bar context menu or with `bureauTheme.sounds.statusBarItem`.
- **New lore icons** (16 original glyphs): Polaris (Copilot and chat), the Ashtray Maze (Source Control), the teleporting rubber duck (Run and Debug), the floppy disk (Save), Ahti's tape (Timeline), the Benicoff TV (Debug Console), the slide projector (Output), the home safe (workspace trust), Ahti's mop (Clear all), the Oceanview Motel key (keys), the Oldest House (Home), the Threshold (Remote), the Aberrant from *CONTROL Resonant* (Tools), the Songmaster Jukebox (music) and the resonance (sound). 184 VS Code icons are now replaced.
- The extension registers its own icons, so the status bar and the console look the same with any product icon theme.

### Changed

- New name: **Bureau — CONTROL Fan Theme**, with a new description.
- **Bureau Product Icons (Color)** colours **every** icon: objects in their real colours and the interface in the Bureau's steel blue, with green, amber and red for go, caution and stop.
- The pyramid is no longer everywhere: it stays on the Git branch (and the Board on licences). The root folder is the Oldest House, `.git` carries the Ashtray Maze and AI files carry Polaris.
- The details page spreads the icons through the descriptions as small chips (they load over https), with a new *Objects of Power in your toolbar* table, instead of a block of badges at the top.

## [0.3.0] — 2026-10-08

### Added

- **Bureau Product Icons (Color)**: a second product icon theme with the game objects in their real colours — the red Hotline telephone, the cyan Hedron, the manila dossier, the brass FBC badge, the Board speaking in red, Hiss-red errors, amber warnings, a phosphor-green terminal prompt and coloured marks on the Git pyramid. It is a colour font (COLR/CPAL tables written by the project). The theme-colour version stays as it was.
- Badges on the details page (they load over https): fan emblems drawn with the project's own glyphs, and how the pack is built (JavaScript, Node.js, esbuild, Claude Code, no runtime dependencies, WCAG, MIT).
- A **How it's made** section in English and Spanish.

### Changed

- **Bureau Icons**: files go back to the 0.2.0 look — the label or pictogram in the colour of the language over the classification band, without the solid sheet — larger and aligned to whole pixels, so they stay sharp at 16 px. Folders keep their 0.2.1 design and all 340 extensions are still covered.
- **CONTROL Astral**: livelier code colours (keywords, types, strings, numbers, attributes…), clearly different from the black text. Code is now checked at WCAG AA (≥ 4.5:1); body text stays AAA (16.8:1).
- **Faster start-up**: the extension code is bundled with esbuild into a single 26 KB file; the sound engine, the font installer and the log channel are only loaded when needed, and the initial work runs after activation. Its own work at start-up went from 17 ms to 3 ms.
- The disclaimer uses the exact wording of Remedy's rules for fan content.

## [0.2.2] — 2026-10-07

### Changed

- New name: **Theme CONTROL**, with a shorter description.
- New extension icon: the Board as it appears in the Astral Plane — a matte black inverted pyramid floating in the white void (original artwork, no game assets).
- The details page is now bilingual — a complete English section and a complete Spanish section — with new professional screenshots: the four themes, Bureau Icons, Bureau Product Icons and the typography.
- The Git branch in the status bar keeps the inverted pyramid when the branch has uncommitted changes, staged changes or conflicts (with a small mark), and when creating or deleting branches.

## [0.2.1] — 2026-10-07

### Added

- **Bureau Product Icons** expanded from 27 to **160 VS Code icons** (97 glyphs): status bar (publish/sync, errors, warnings, remote indicator), panel toolbars (new, split, kill, maximize, close, more actions, tasks, terminal profiles), trees (chevrons, new file/folder, refresh, collapse all, filter), title bar (back/forward, layout toggles, window controls), debug toolbar, AI sparkles (the Board), packages (a cube) and more.
- **Bureau Icons** redesigned and expanded: files are solid Bureau dossiers with their code or a pictogram; folders are solid, coloured by category and carry an **emblem**. Now 498 icons covering 340 extensions, 284 well-known file names (tool configs, lockfiles, Docker, CI, .NET…), 84 languages and 278 folder names. AI instruction files (`CLAUDE.md`, `AGENTS.md`, `*.prompt.md`) carry the Board.

### Changed

- New extension icon: the Board's inverted pyramid with the FBC red slit and the Hedron line.
- New title and description; the author and publisher is **Normalxxnavi**.
- README rewritten as a complete details page.

## [0.2.0] — 2026-10-07

### Added

- **Bureau Product Icons**: a product icon theme that replaces VS Code's own icons — activity bar (explorer, search, source control, run and debug, extensions, accounts, settings), the Git branch in the status bar (the inverted pyramid), Copilot and Chat (the Board), notifications (the Hotline telephone), testing and terminal. Works with the activity bar on the side, on top or at the bottom.
- **Typography** inspired by the games (optional, offered on first start): *Bureau* (Overpass Mono / Overpass, derived from Highway Gothic like Interstate) and *Resonant* (Space Mono / Space Grotesk), or *Follow the theme*. Fonts (SIL OFL) are installed for the current user only; the previous font is restored on demand. Commands *CONTROL: Choose Typography…* and *CONTROL: Remove Installed Fonts*; setting `bureauTheme.font`.
- Accent glow on floating widgets and scrolled edges; accent current line number, active indent guide, bracket match and rulers; accent line under the tabs; darker line-number gutter.

### Changed

- **CONTROL Black** has its own identity: the *Astral Plane in negative*, with signage lines, cursor and glows in astral white and FBC red kept for selection and details.
- **CONTROL Astral** is easier to read: darker, more saturated text and syntax colours (body text 16.8:1, code ≥ 7:1, comments 6.75:1), checked with stricter AAA targets.

### Removed

- The status bar location indicator (`▼ THE OLDEST HOUSE`…) and its setting.

## [0.1.1] — 2026-10-06

### Added

- **CONTROL Astral**, a light theme inspired by the Astral Plane: a white void framed by black geometry, with red only for details.
- **Bureau Icons** file icon theme: dossier-style labels and pictograms with a classification band, concrete folders with coloured tabs, dark and light variants. Lore details: redacted `.env` files, Hedron hexagon for tests, the Board's pyramid as root folder.
- Status bar **location** indicator (removed in 0.2.0).

### Changed

- Redesigned frame (Bureau signage): a dark *monolith* for the activity bar, status bar and title bar; sidebar titles as monolith bands with an accent line; accent rules between sections; accent indent guides; "astral light" for active frame elements; accent line on top of the status bar.
- Chat panels: elevated request bubbles, accent-framed code blocks, monolith avatars and themed session indicators.
- Floating widgets (Command Palette, notifications) get a thin accent frame.

## [0.1.0] — 2026-10-06

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
