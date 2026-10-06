# Bureau Theme — inspired by CONTROL

Three dark themes for Visual Studio Code inspired by the brutalist look of **CONTROL** and **CONTROL Resonant**, plus **optional** sound effects for everyday VS Code events.

> Fan-made project. Not affiliated with or endorsed by Remedy Entertainment. See the [disclaimer](#disclaimer).

![CONTROL Dark](images/screenshots/control-dark.png)

## Themes

| Theme | Inspired by | Look |
|---|---|---|
| **CONTROL Dark** | *Control* (2019) — The Oldest House | Warm charcoal concrete, bone-white text, FBC red as the UI accent. The reference theme. |
| **CONTROL Black** | *Control* (2019) — Black Rock | Same hierarchy on a near-black background for OLED screens (`#0A0A0B`, not pure black, to avoid smearing). |
| **CONTROL Resonant** | *Control Resonant* (2026) — patterned Manhattan | Cold wet-asphalt greys and a pale cyan accent. Following the game's art direction, **red belongs to the Hiss**: it only appears for errors and deletions. |

<table>
  <tr>
    <td><img src="images/screenshots/control-black.png" alt="CONTROL Black"></td>
    <td><img src="images/screenshots/control-resonant.png" alt="CONTROL Resonant"></td>
  </tr>
</table>

Design rules behind the colours:

- **Readability first.** Every text colour is checked against WCAG contrast ratios (body text ≥ 7:1, code tokens ≥ 4.5:1).
- **Red is used sparingly.** In Dark and Black the red accent marks the cursor, the active tab, focus and badges. In code, only control-flow keywords (`if`, `return`, `throw`…) are red; declarations (`public`, `const`, `class`…) use a muted tone.
- **Active ≠ broken.** The error colour is lighter and pinker than the accent so a red squiggle is never confused with an active element.
- Full coverage of the UI (655 colour keys, including the new *modern UI* tabs of VS Code 1.140), the integrated terminal (16 ANSI colours), Git decorations, diff/merge editors, bracket pair colours and **semantic highlighting** (including C# / Roslyn and Razor tokens).

### Install

1. Install the extension (from the Marketplace or with `code --install-extension bureau-theme-<version>.vsix`).
2. Open the theme picker with <kbd>Ctrl</kbd>+<kbd>K</kbd> <kbd>Ctrl</kbd>+<kbd>T</kbd> (<kbd>Cmd</kbd>+<kbd>K</kbd> <kbd>Cmd</kbd>+<kbd>T</kbd> on macOS) and choose **CONTROL Dark**, **CONTROL Black** or **CONTROL Resonant**.

## Optional sounds

The extension can play short sound effects inspired by both games. **They are off by default** and every event has its own switch, so you only hear what you want.

Turn them on with the command **CONTROL: Toggle Sounds**, or in Settings (<kbd>Ctrl</kbd>+<kbd>,</kbd>) under *CONTROL Theme — Sounds*. Use **CONTROL: Preview Sounds…** to listen to every sound of both packs.

| Event | Default | Control pack | Resonant pack |
|---|---|---|---|
| VS Code starts | off | Low concrete hum of the Oldest House | Distant, warped city |
| Switching to a CONTROL theme | on | Old red-phone ring | Hedron pulse |
| Manual save (auto-save is ignored) | off | Rubber stamp | Metallic tick |
| New errors | on | Hiss-like whisper | Whisper with patterned echoes |
| Last error fixed | on | Control Point cleansed | Resonant defeated |
| Task / build succeeded | on | Elevator ding | Rising glass arpeggio |
| Task / build failed | on | Bureau alert | Gravity distortion |
| Terminal command failed | off | Radio static | Glitched static |
| Debugging started | on | Service-weapon transformation | Shape-shifting weapon |
| Breakpoint hit | on | Slide projector | Gravity shift |
| Git commit | on | Typewriter and bell | Metal hit with echoes |

**All sounds are original recreations** synthesized from scratch — no audio, music or voices from the games are included or downloaded. See [`sounds/LICENSES.md`](sounds/LICENSES.md).

### Sound settings

| Setting | Default | Description |
|---|---|---|
| `bureauTheme.sounds.enabled` | `false` | Master switch. |
| `bureauTheme.sounds.pack` | `auto` | `auto` follows the active theme (Resonant → Resonant pack, otherwise Control pack), or force `control` / `resonant`. |
| `bureauTheme.sounds.volume` | `50` | 0–100. |
| `bureauTheme.sounds.onlyWithControlTheme` | `true` | Stay silent while another theme is active. |
| `bureauTheme.sounds.errorTrigger` | `onSave` | `onSave`: check for new errors after saving. `live`: after a short pause while you type. |
| `bureauTheme.sounds.cooldownMs` | `1500` | Minimum time between sounds. More important sounds (errors, failed builds) can still interrupt less important ones. |
| `bureauTheme.sounds.customFolder` | `""` | Folder with your own `.wav` files (user settings only). Missing files fall back to the selected pack. |
| `bureauTheme.sounds.events.*` | see above | One switch per event. |

**Custom sounds:** put `.wav` files named `startup.wav`, `theme.wav`, `save.wav`, `error.wav`, `clear.wav`, `build-ok.wav`, `build-fail.wav`, `terminal-fail.wav`, `debug.wav`, `breakpoint.wav` and `commit.wav` in a folder and point `bureauTheme.sounds.customFolder` to it. You don't need all of them. Only use audio you have the right to use.

**How it plays audio:** VS Code has no audio API for extensions, so the extension uses the system player — a background PowerShell process on Windows, `afplay` on macOS and `paplay`, `pw-play` or `aplay` on Linux. With Remote-SSH, WSL or Codespaces the sounds play on your local machine. Sounds are not available in the browser (vscode.dev).

## Recommended settings

```jsonc
{
  "editor.fontFamily": "'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
  "editor.fontLigatures": true,
  "editor.bracketPairColorization.enabled": true,
  "editor.guides.bracketPairs": "active",
  "editor.semanticHighlighting.enabled": true
}
```

Comments, parameters and type parameters are *italic*. To turn italics off:

```jsonc
{
  "editor.tokenColorCustomizations": {
    "[CONTROL Dark][CONTROL Black][CONTROL Resonant]": {
      "textMateRules": [
        {
          "scope": ["comment", "variable.parameter", "entity.name.type.type-parameter", "variable.language", "markup.quote"],
          "settings": { "fontStyle": "" }
        }
      ]
    }
  },
  "editor.semanticTokenColorCustomizations": {
    "[CONTROL Dark][CONTROL Black][CONTROL Resonant]": {
      "rules": { "parameter": { "italic": false }, "typeParameter": { "italic": false }, "*.abstract": { "italic": false } }
    }
  }
}
```

## Tested languages

C#, Razor (`.cshtml`), JavaScript, TypeScript, JSON, HTML, CSS, SCSS, SQL, Markdown, XML, YAML, Python, Bash, diff and Git merge conflicts.

## Known limitations

- Semantic colours depend on each language extension (for C# and Razor, the official C# extension).
- The theme colours the Markdown **editor**; the Markdown **preview** uses its own stylesheet.
- On Linux, sounds need `paplay` (PulseAudio/PipeWire), `pw-play` or `aplay` (ALSA).
- The *terminal command failed* sound requires terminal shell integration.

## Roadmap

- More variants: **Hiss** (aggressive red), **Astral Plane** (light theme), **Ashtray Maze**, **Gravity Anomaly**, **Oldest House** (lighter brutalist grey).
- Optional lore extras, such as a *Classified* mode that hides the values in `.env` files behind black bars while you share your screen.

See [CHANGELOG.md](CHANGELOG.md) for the release history.

## Disclaimer

Fan-made project. Not affiliated with or endorsed by Remedy Entertainment. CONTROL and CONTROL Resonant are trademarks of their respective owners. All sounds are original recreations. No game assets (images, logos, audio, music or text) are included.

## License

[MIT](LICENSE)
