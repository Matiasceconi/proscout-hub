export function dedupeFixtureRecords(rows = []) {
  const byKey = new Map();

  for (const row of rows || []) {
    if (!row) continue;
    const provider = row.provider || 'unknown';
    const externalId = row.provider_fixture_id || row.id;
    const key = `${provider}:${externalId}`;
    const current = byKey.get(key);

    if (!current) {
      byKey.set(key, row);
      continue;
    }

    const score = (fixture) =>
      ((fixture.mapped_club_ids?.length || 0) * 10) +
      ((fixture.linked_player_ids?.length || 0) * 3) +
      (fixture.home_team_logo ? 1 : 0) +
      (fixture.away_team_logo ? 1 : 0);

    if (score(row) > score(current)) byKey.set(key, row);
  }

  return [...byKey.values()];
}
