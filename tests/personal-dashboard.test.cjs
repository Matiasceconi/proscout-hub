const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function loadTs(file, injectedRequire) {
  const full = path.resolve(file);
  const source = ts.transpileModule(fs.readFileSync(full, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'exports', 'module', 'Deno', 'fetch', source)(
    injectedRequire || require,
    module.exports,
    module,
    { env: { get: () => undefined } },
    async () => { throw new Error('Unexpected network call'); }
  );
  return module.exports;
}

test('legacy personal dashboard endpoint is retired', async () => {
  const handler = loadTs('base44/functions/personal-dashboard/entry.ts').default;
  const response = await handler(new Request('https://test.invalid'));
  assert.equal(response.status, 410);
});

test('Sportmonks preserves zero, missing values and season boundaries', () => {
  const model = loadTs('base44/shared/agencyData.ts');
  const normalized = model.normalizeSportmonksPlayer({ data: { id: 99, statistics: [
    { season_id: 1, team_id: 2, details: [
      { type: { developer_name: 'MINUTES_PLAYED' }, value: { total: 90 } },
      { type: { developer_name: 'GOALS' }, value: { total: 0 } },
      { type: { developer_name: 'ASSISTS' }, value: { average: 2 } }
    ] },
    { season_id: 2, team_id: 2, details: [{ type: { developer_name: 'GOALS' }, value: { total: 9 } }] }
  ] } });
  assert.equal(normalized.seasons[0].goals, 0);
  assert.equal(normalized.seasons[0].assists, null);
  const stats = model.aggregateSeason(normalized.seasons, '1');
  assert.equal(stats.goals, 0);
  assert.equal(stats.minutes, 90);
  assert.equal(model.aggregateSeason(normalized.seasons, 'missing').goals, null);
});

test('partial provider data does not masquerade as a complete season total', () => {
  const model = loadTs('base44/shared/agencyData.ts');
  const stats = model.aggregateSeason([
    { season_id: '1', minutes: 90, goals: 1 },
    { season_id: '1', minutes: null, goals: 2 }
  ], '1');
  assert.equal(stats.minutes, null);
  assert.equal(stats.goals, 3);
  assert.equal(stats.goals_per90, null);
});

test('retired AI photo search cannot invoke a hidden model', async () => {
  const handler = loadTs('base44/functions/searchAndAssignPhoto/entry.ts').default;
  const response = await handler(new Request('https://test.invalid'));
  assert.equal(response.status, 410);
});
