# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [0.8.1] — 2026-10-07

### Changed

- New name: **Theme CONTROL**, with a shorter description.
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
