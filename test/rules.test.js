'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const rules = require('../src/extension/rules');
const { normalizeConfig } = require('../src/extension/config');

test('el cooldown bloquea sonidos de igual o menor prioridad', () => {
  let now = 0;
  const gate = rules.createGate(() => now);
  assert.equal(gate.tryPass(3, 1000), true);
  now = 500;
  assert.equal(gate.tryPass(3, 1000), false, 'misma prioridad dentro del cooldown');
  assert.equal(gate.tryPass(1, 1000), false, 'menor prioridad dentro del cooldown');
  now = 1000;
  assert.equal(gate.tryPass(1, 1000), true, 'pasado el cooldown suena cualquiera');
});

test('un sonido más importante interrumpe aunque no haya pasado el cooldown', () => {
  let now = 0;
  const gate = rules.createGate(() => now);
  gate.tryPass(1, 1500); // guardar
  now = 200;
  assert.equal(gate.tryPass(5, 1500), true, 'el error suena justo después de guardar');
  now = 400;
  assert.equal(gate.tryPass(4, 1500), false, 'y bloquea a uno menos importante');
});

test('classifyErrorChange', () => {
  assert.equal(rules.classifyErrorChange(undefined, 3), null, 'sin referencia no suena');
  assert.equal(rules.classifyErrorChange(0, 2), 'newError');
  assert.equal(rules.classifyErrorChange(2, 5), 'newError');
  assert.equal(rules.classifyErrorChange(5, 2), null, 'bajar sin llegar a 0 no suena');
  assert.equal(rules.classifyErrorChange(2, 0), 'allClear');
  assert.equal(rules.classifyErrorChange(0, 0), null);
});

test('taskExitSound', () => {
  assert.equal(rules.taskExitSound(0), 'buildSuccess');
  assert.equal(rules.taskExitSound(1), 'buildFail');
  assert.equal(rules.taskExitSound(undefined), null);
});

test('terminalExitSound ignora éxito, desconocido y Ctrl+C', () => {
  assert.equal(rules.terminalExitSound(0), null);
  assert.equal(rules.terminalExitSound(undefined), null);
  assert.equal(rules.terminalExitSound(130), null);
  assert.equal(rules.terminalExitSound(0xc000013a), null);
  assert.equal(rules.terminalExitSound(-1073741510), null);
  assert.equal(rules.terminalExitSound(1), 'terminalFail');
  assert.equal(rules.terminalExitSound(127), 'terminalFail');
});

test('isBreakpointStop', () => {
  for (const r of ['breakpoint', 'function breakpoint', 'data breakpoint', 'instruction breakpoint', 'debugger statement']) {
    assert.equal(rules.isBreakpointStop(r), true, r);
  }
  for (const r of ['step', 'pause', 'entry', 'exception', 'goto', undefined, 42]) {
    assert.equal(rules.isBreakpointStop(r), false, String(r));
  }
});

test('resolvePack', () => {
  assert.equal(rules.resolvePack('control', 'resonant'), 'control');
  assert.equal(rules.resolvePack('resonant', 'control'), 'resonant');
  assert.equal(rules.resolvePack('auto', 'resonant'), 'resonant');
  assert.equal(rules.resolvePack('auto', 'control'), 'control');
  assert.equal(rules.resolvePack('auto', null), 'control', 'con otro tema se usa Control');
});

test('activeThemeLabel respeta la detección automática del modo del sistema', () => {
  const s = { autoDetect: false, colorTheme: 'CONTROL Dark', preferredDark: 'CONTROL Resonant', preferredLight: 'Light+' };
  assert.equal(rules.activeThemeLabel(s, 2), 'CONTROL Dark');
  assert.equal(rules.activeThemeLabel({ ...s, autoDetect: true }, 2), 'CONTROL Resonant');
  assert.equal(rules.activeThemeLabel({ ...s, autoDetect: true }, 1), 'Light+');
  assert.equal(rules.activeThemeLabel({ ...s, preferredHighContrast: 'Dark High Contrast' }, 3), 'Dark High Contrast');
});

test('themePacks deduce el pack por la ruta del tema', () => {
  const packs = rules.themePacks([
    { label: 'CONTROL Dark', path: './themes/control-dark-color-theme.json' },
    { label: 'CONTROL Resonant', path: './themes/control-resonant-color-theme.json' },
  ]);
  assert.equal(packs.get('CONTROL Dark'), 'control');
  assert.equal(packs.get('CONTROL Resonant'), 'resonant');
  assert.equal(packs.get('Default Dark+'), undefined);
});

test('shouldPlay', () => {
  const base = normalizeConfig((k) => ({ enabled: true, 'events.save': true })[k]);
  assert.equal(rules.shouldPlay(base, 'save', true), true);
  assert.equal(rules.shouldPlay(base, 'save', false), false, 'solo con tema CONTROL por defecto');
  assert.equal(rules.shouldPlay({ ...base, onlyWithControlTheme: false }, 'save', false), true);
  assert.equal(rules.shouldPlay(base, 'newError', true), false, 'evento desactivado');
  assert.equal(rules.shouldPlay({ ...base, enabled: false }, 'save', true), false, 'interruptor general');
  assert.equal(rules.shouldPlay({ ...base, volume: 0 }, 'save', true), false, 'volumen 0');
});

test('normalizeConfig corrige valores escritos a mano', () => {
  const c = normalizeConfig((k) => ({ enabled: 'yes', pack: 'otro', volume: 250, cooldownMs: -5, errorTrigger: 'x', customFolder: '  C:/sonidos  ' })[k]);
  assert.equal(c.enabled, false, 'solo true activa');
  assert.equal(c.pack, 'auto');
  assert.equal(c.volume, 100);
  assert.equal(c.cooldownMs, 0);
  assert.equal(c.errorTrigger, 'onSave');
  assert.equal(c.onlyWithControlTheme, true, 'por defecto true');
  assert.equal(c.customFolder, 'C:/sonidos');
  assert.equal(normalizeConfig(() => undefined).volume, 50);
});
