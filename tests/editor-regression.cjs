const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('dist/index.html', 'utf8');
const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(match => match[1]));
const elements = new Map();
const get = id => {
  assert(ids.has(id), 'missing ' + id);
  if (!elements.has(id)) {
    const events = new Map();
    elements.set(id, {
      events, value: 0, style: {},
      classList: { add() {}, remove() {}, toggle() {} },
      getContext() { return {}; },
      addEventListener(type, handler) { events.set(type, handler); },
      setAttribute() {}, replaceChildren() {}, appendChild() {}
    });
  }
  return elements.get(id);
};
const box = {
  document: { querySelector: selector => get(selector.slice(1)) },
  localStorage: { getItem: () => null, setItem() {} },
  ResizeObserver: class { observe() {} },
  setTimeout() {}, confirm: () => true
};
vm.createContext(box);
const run = source => vm.runInContext(source, box);
for (const file of ['viewer3d.js', 'physics.js', 'app.js']) {
  run(fs.readFileSync('dist/' + file, 'utf8').replace('function draw(){', 'function draw(){return;'));
}
const fire = (id, type, event = {}) => get(id).events.get(type)?.({ target: get(id), ...event });
function keyboardChange(key, value) {
  fire('nose', 'keydown', { key });
  get('nose').value = value;
  fire('nose', 'input');
  fire('nose', 'change');
}

keyboardChange('PageUp', 55);
assert.equal(get('undo').disabled, false, 'PageUp changes must be undoable');
get('undo').onclick();
assert.equal(run('params.nose'), 45);
get('redo').onclick();
assert.equal(run('params.nose'), 55);

keyboardChange('End', 100);
get('undo').onclick();
assert.equal(run('params.nose'), 55);
fire('nose', 'pointerdown');
fire('nose', 'input'); // Same value: touching a slider must preserve redo.
fire('nose', 'change');
assert.equal(get('redo').disabled, false, 'a no-op must preserve redo');
get('redo').onclick();
assert.equal(run('params.nose'), 100);
const undoCount = run('undo.length');
fire('nose', 'keydown', { key: 'End' });
assert.equal(run('undo.length'), undoCount, 'a boundary key must not record a no-op');

keyboardChange('PageDown', 90);
fire('nose', 'pointerdown');
for (const value of [70, 60]) {
  get('nose').value = value;
  fire('nose', 'input');
}
fire('nose', 'change');
get('undo').onclick();
assert.equal(run('params.nose'), 90, 'one drag must undo as one edit');
get('redo').onclick();
assert.equal(run('params.nose'), 60);

get('frontFold').onclick();
const frontYaw = run('orbit.yaw');
run("setMode('flight');setMode('edit')");
assert.equal(get('modeLabel').textContent, 'FRONT VIEW / FOLD ANGLES');
assert.equal(run('orbit.yaw'), frontYaw, 'returning from flight must keep the camera');
fire('scene', 'keydown', { key: 'ArrowRight', preventDefault() {} });
assert.equal(get('modeLabel').textContent, '3D / ORBIT VIEW', 'rotation must update the view label');

console.log('PASS: keyboard undo/redo, no-op preservation, drag grouping, camera label after flight and rotation.');
