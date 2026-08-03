export async function upsertFixture(base44: any, fd: any, orgId: string, provider: string, teamIdMap: Map<string, string>, srcClubId: string): Promise<"created" | "updated"> {
  const asAdmin = base44.asServiceRole;
  const provider_fixture_id = String(fd.fixture.id);
  const existing = await asAdmin.entities.ClubFixture.filter({ organization_id: orgId, provider, provider_fixture_id });
  const mapped: string[] = [srcClubId];
  const homeId = String(fd.teams.home.id), awayId = String(fd.teams.away.id);
  if (teamIdMap.has(homeId) && teamIdMap.get(homeId) !== srcClubId) mapped.push(teamIdMap.get(homeId)!);
  if (teamIdMap.has(awayId) && teamIdMap.get(awayId) !== srcClubId) mapped.push(teamIdMap.get(awayId)!);
  const rec: any = {
    organization_id: orgId, provider_fixture_id, provider,
    home_provider_team_id: homeId, away_provider_team_id: awayId,
    home_team_name: fd.teams.home.name, away_team_name: fd.teams.away.name,
    home_team_logo: fd.teams.home.logo, away_team_logo: fd.teams.away.logo,
    competition_name: fd.league.name, competition_logo: fd.league.logo, competition_id: String(fd.league.id),
    season: String(fd.league.season), round: fd.league.round,
    fixture_date: new Date(fd.fixture.date).toISOString(),
    stadium: fd.fixture.venue?.name || null, fixture_city: fd.fixture.venue?.city || null,
    fixture_status: fd.fixture.status?.short || null, fixture_status_long: fd.fixture.status?.long || null,
    home_score: fd.goals?.home ?? null, away_score: fd.goals?.away ?? null,
    mapped_club_ids: [...new Set(mapped)], last_sync_at: new Date().toISOString(),
  };
  if (existing.length > 0) {
    const ex = existing[0];
    await asAdmin.entities.ClubFixture.update(ex.id, {
      ...rec,
      home_team_logo: ex.home_team_logo || rec.home_team_logo,
      away_team_logo: ex.away_team_logo || rec.away_team_logo,
      mapped_club_ids: [...new Set([...(ex.mapped_club_ids || []), ...mapped])]
    });
    return "updated";
  }
  await asAdmin.entities.ClubFixture.create(rec);
  return "created";
}

export async function buildTeamIdMap(base44: any, organization_id: string): Promise<Map<string, string>> {
  const allMappings = await base44.asServiceRole.entities.ClubProviderMapping.filter({
    organization_id, provider: "api_football", mapping_status: "verified"
  });
  const map = new Map<string, string>();
  for (const m of allMappings) map.set(m.provider_team_id, m.club_id);
  return map;
}

export function sanitizeError(msg: string): string {
  return msg?.replace(/key=[^&]+/g, "key=***") || "Unknown error";
}