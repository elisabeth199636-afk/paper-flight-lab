const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { create, parse } = require('../experiments/share-link-codec.js');
const { buildPlaneMesh, tailPolygon, tailConnection } = require('../dist/viewer3d.js');
const { simulate } = require('../dist/physics.js');

const base = 'https://paper-flight-lab-yusha.elisabeth199636.chatgpt.site/';
const defaults = { nose: 45, wing: 55, trim: 3, body: 12, opening: 15, dihedral: 0, cuts: [] };
const lengths = [];
for (const count of [0, 12, 30]) {
  const params = { ...defaults, cuts: Array.from({ length: count }, (_, i) => ({ side: 0, line: [-1, 1, .45 - i * .005] })) };
  const link = create(base, '纸飞机玩家 ✈', params);
  const received = parse(link);
  assert.deepEqual(received.params, params, 'preserve every parameter and cut coefficient');
  assert.deepEqual(buildPlaneMesh(received.params), buildPlaneMesh(params), 'recreate the same 3D design');
  for (const side of [-1, 1]) {
    assert(tailPolygon(received.params, side).length >= 3);
    assert(tailConnection(received.params, side) >= .15);
  }
  assert.deepEqual(simulate(received.params), simulate(params), 'recompute the same flight');
  assert(!link.includes('?'), 'share only a design, without source query parameters');
  lengths.push({ cuts: count, characters: link.length });
}

// Separate JS contexts represent sender and receiver. No shared storage or scores.
const physicsSource = fs.readFileSync('dist/physics.js', 'utf8');
const runFlight = params => vm.runInNewContext(physicsSource + '\nsimulate(params)', { params });
const sender = { ...defaults, cuts: [{ side: -1, line: [-1, 0, .89] }] };
const received = parse(create(base, '朋友 A', sender));
assert.equal(runFlight(sender).distance, runFlight(received.params).distance);
const challenger = { ...defaults, nose: 65, wing: 75, trim: 1.5 };
const comparison = { friend: simulate(received.params).distance, challenger: simulate(challenger).distance };
assert.notEqual(comparison.friend, comparison.challenger, 'different flight parameters can be compared');
const cosmeticChange = { ...sender, body: 24, opening: 30, dihedral: 35, cuts: [] };
assert.equal(simulate(sender).distance, simulate(cosmeticChange).distance, 'cosmetic-only edits must not invent a score advantage');
assert.notDeepEqual(buildPlaneMesh(sender), buildPlaneMesh(cosmeticChange));

const encode = payload => base + '#flight=' + Buffer.from(JSON.stringify(payload)).toString('base64url');
const validPayload = { v: 1, model: 1, name: '朋友', p: [45, 55, 3, 12, 15, 0], c: [] };
assert.throws(() => parse(encode({ ...validPayload, model: 2 })));
assert.throws(() => parse(encode({ ...validPayload, distance: 999999 })));
assert.throws(() => parse(encode({ ...validPayload, p: [101, 55, 3, 12, 15, 0] })));
assert.throws(() => parse(encode({ ...validPayload, c: [[0, 0, 0, 1]] })));
assert.throws(() => parse(encode({ ...validPayload, name: '<script>' })));
assert.throws(() => parse(base + '#flight=' + 'a'.repeat(8193)));
assert.throws(() => parse(base + '#flight=invalid!'));
assert.equal(parse(base), null);

console.log('PASS: link round-trip, independent receiver simulation, exact mesh and cut restoration, untrusted payload rejection, cosmetic-only scoring boundary.');
console.log(JSON.stringify({ lengths, comparison }, null, 2));
