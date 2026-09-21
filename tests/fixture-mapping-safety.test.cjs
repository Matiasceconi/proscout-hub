const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const autoMap = fs.readFileSync('base44/functions/autoMapClubs/entry.ts', 'utf8');
const fixtureUtils = fs.readFileSync('base44/shared/fixtureUtils.ts', 'utf8');
const uiDedupe = fs.readFileSync('src/lib/fixtureRecords.js', 'utf8');

test('auto mapping does not use fuzzy substring matching', () => {
  assert.equal(autoMap.includes('norm.includes(m)'), false);
});

test('ambiguous generic aliases are not auto-verified', () => {
  for (const unsafe of ['"sanmartin"', '"gimnasia"', '"barcelona"', '"catolica"', '"colon"', '"arsenal"', '"ferro"', '"belgrano"', '"talleres"']) {
    assert.equal(autoMap.includes(unsafe), false, `unsafe alias still present: ${unsafe}`);
  }
});

test('fixture mappings replace stale associations and UI has duplicate guard', () => {
  assert.match(fixtureUtils, /mapped_club_ids: \[\.\.\.new Set\(mapped\)\]/);
  assert.match(uiDedupe, /provider_fixture_id/);
  assert.match(uiDedupe, /byKey/);
});
