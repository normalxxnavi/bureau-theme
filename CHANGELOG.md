# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

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
