export async function upsertFixture(base44: any, fd: any, orgId: string, provider: string, teamIdMap: Map<string, string>, _srcClubId: string): Promise<"created" | "updated"> {
  const asAdmin = base44.asServiceRole;
  const provider_fixture_id = String(fd.fixture.id);
  const existing = await asAdmin.entities.ClubFixture.filter({ organization_id: orgId, provider, provider_fixture_id });
  const homeId = String(fd.teams.home.id), awayId = String(fd.teams.away.id);
  // A fixture belongs only to internal clubs whose verified provider ID is one
  // of the two teams actually playing. Never trust the club that triggered the sync.
  const mapped = [teamIdMap.get(homeId), teamIdMap.get(awayId)].filter(Boolean) as string[];
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
      // The provider teams are the source of truth. Replacing instead of merging
      // removes stale links created by older fuzzy mappings.
      mapped_club_ids: [...new Set(mapped)]
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
  const byProviderId = new Map<string, string[]>();
  for (const m of allMappings) {
    if (!m.provider_team_id || !m.club_id) continue;
    const ids = byProviderId.get(String(m.provider_team_id)) || [];
    ids.push(String(m.club_id));
    byProviderId.set(String(m.provider_team_id), ids);
  }

  // A provider team must resolve to exactly one internal club. If two internal
  // clubs claim the same provider ID, the mapping is ambiguous and is excluded
  // rather than silently letting the last record win.
  const map = new Map<string, string>();
  for (const [providerId, clubIds] of byProviderId.entries()) {
    const uniqueClubIds = [...new Set(clubIds)];
    if (uniqueClubIds.length === 1) map.set(providerId, uniqueClubIds[0]);
  }
  return map;
}

export function sanitizeError(msg: string): string {
  return msg?.replace(/key=[^&]+/g, "key=***") || "Unknown error";
}