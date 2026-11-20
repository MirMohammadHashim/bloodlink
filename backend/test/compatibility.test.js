const test = require('node:test');
const assert = require('node:assert');
const { normalizeBloodGroup, compatibleDonorGroups } = require('../src/compatibility');

test('O- is the universal donor', () => {
  for (const g of ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']) {
    assert.ok(compatibleDonorGroups(g).includes('O-'), `${g} should accept O-`);
  }
});

test('AB+ is the universal recipient', () => {
  assert.strictEqual(compatibleDonorGroups('AB+').length, 8);
});

test('O- can only receive O-', () => {
  assert.deepStrictEqual(compatibleDonorGroups('O-'), ['O-']);
});

test('Rh-negative patients never get Rh-positive blood', () => {
  for (const g of ['A-', 'B-', 'AB-', 'O-']) {
    assert.ok(compatibleDonorGroups(g).every((d) => d.endsWith('-')), g);
  }
});

test('normalizeBloodGroup handles case, spaces and "+" sent as a space', () => {
  assert.strictEqual(normalizeBloodGroup('ab+'), 'AB+');
  assert.strictEqual(normalizeBloodGroup(' o- '), 'O-');
  assert.strictEqual(normalizeBloodGroup('B '), 'B+'); // "B+" in a raw query string
  assert.strictEqual(normalizeBloodGroup('C+'), null);
  assert.strictEqual(normalizeBloodGroup(undefined), null);
});
