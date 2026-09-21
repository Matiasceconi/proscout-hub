import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { buildTeamIdMap, sanitizeError } from '../../shared/fixtureUtils.ts';

const TEAM_MAP: { match: string[]; id: string; name: string }[] = [
  { match: ["tigre"], id: "452", name: "Tigre" },
  { match: ["toluca"], id: "2281", name: "Toluca" },
  { match: ["ucatolicachile", "universidadcatolicachile"], id: "2994", name: "U. Católica" },
  { match: ["usanmartinperu", "universidadsanmartinperu"], id: "2549", name: "U. San Martín" },
  { match: ["barbastro"], id: "9879", name: "UD Barbastro" },
  { match: ["langreo"], id: "5265", name: "UP Langreo" },
  { match: ["velez", "velezsarsfield"], id: "438", name: "Vélez Sarsfield" },
  { match: ["rosariocentral"], id: "437", name: "Rosario Central" },
  { match: ["santosfc"], id: "128", name: "Santos" },
  { match: ["newells", "newellsoldboys"], id: "457", name: "Newell's" },
  { match: ["ohiggins"], id: "2320", name: "O'Higgins" },
  { match: ["olimpiaparaguay"], id: "1182", name: "Olimpia" },
  { match: ["laserena"], id: "2341", name: "La Serena" },
  { match: ["lanus"], id: "446", name: "Lanús" },
  { match: ["losandes"], id: "483", name: "Los Andes" },
  { match: ["manutd", "manchesterunited"], id: "33", name: "Man Utd" },
  { match: ["defensayjusticia", "defensa"], id: "442", name: "Defensa" },
  { match: ["defensaii"], id: "18684", name: "Defensa II" },
  { match: ["elche"], id: "797", name: "Elche CF" },
  { match: ["estudianteslaplata", "caestudiantes"], id: "450", name: "Estudiantes" },
  { match: ["ferrocarriloeste"], id: "470", name: "Ferro" },
  { match: ["fluminense"], id: "124", name: "Fluminense" },
  { match: ["gimnasiamendoza", "gimnasiayesgrimamendoza"], id: "1066", name: "Gimnasia M." },
  { match: ["circulodeportivo", "circulo"], id: "8399", name: "Circulo Deportivo" },
  { match: ["tijuana"], id: "2280", name: "Club Tijuana" },
  { match: ["colocolo"], id: "2315", name: "Colo-Colo" },
  { match: ["colonsantafe", "cacolonsantafe"], id: "448", name: "Colón Santa Fe" },
  { match: ["cruzeiro"], id: "135", name: "Cruzeiro" },
  { match: ["castellon"], id: "5254", name: "Castellón" },
  { match: ["argentinosii"], id: "18677", name: "Argentinos II" },
  { match: ["argentinosjrs", "argentinosjuniors", "argentinos"], id: "458", name: "Argentinos Jrs." },
  { match: ["arsenalsarandi", "arsenalfcdesarandi"], id: "459", name: "Arsenal Sarandí" },
  { match: ["banfield"], id: "449", name: "Banfield" },
  { match: ["barcelonasc", "barcelonaguayaquil"], id: "1152", name: "Barcelona SC" },
  { match: ["barracascentral", "barracas"], id: "2432", name: "Barracas Central" },
  { match: ["belgranocordoba", "cabelgrano"], id: "440", name: "Belgrano" },
  { match: ["catalleres", "tallerescordoba"], id: "456", name: "CA Talleres" },
  { match: ["temperley"], id: "454", name: "CA Temperley" },
  { match: ["kharkiv"], id: "3628", name: "Kharkiv" },
  { match: ["talleresii"], id: "18699", name: "Talleres II" },
];

function normalizeName(name: string): string {
  return (name || "").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function findTeam(clubName: string): { id: string; name: string } | null {
  const norm = normalizeName(clubName);
  if (!norm) return null;

  // Auto-mapping is intentionally conservative. Only explicit aliases are
  // accepted; substring/fuzzy matching caused Tigres→Tigre, Santos Laguna→Santos,
  // Plaza Colonia→Colón and youth/reserve teams→first-team collisions.
  for (const entry of TEAM_MAP) {
    for (const m of entry.match) {
      if (norm === m) return { id: entry.id, name: entry.name };
    }
  }
  return null;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { organization_id } = body || {};
    if (!organization_id) return Response.json({ error: "organization_id es obligatorio" }, { status: 400 });

    const apiKey = secrets.get("API_FOOTBALL_KEY");
    if (!apiKey) return Response.json({ error: "API_FOOTBALL_KEY no configurada" }, { status: 500 });

    const asAdmin = base44.asServiceRole;
    const baseUrl = "https://v3.football.api-sports.io";
    const headers = { "x-apisports-key": apiKey };
    const now = new Date().toISOString();

    // 1. Read all clubs
    const clubs = await asAdmin.entities.Club.list();

    // 2. Read existing mappings for this org
    const existingMappings = await asAdmin.entities.ClubProviderMapping.filter({ organization_id, provider: "api_football" });
    const mappedClubIds = new Set(existingMappings.map((m: any) => m.club_id));

    // 3. Find teams for unmapped clubs
    const toMap: { club: any; team: { id: string; name: string } }[] = [];
    const noMatch: string[] = [];
    for (const club of clubs) {
      if (mappedClubIds.has(club.id)) continue;
      if (!club.club_name || /without club|sin club|free agent|libre|unattached/i.test(club.club_name)) continue;
      const team = findTeam(club.club_name);
      if (team) {
        toMap.push({ club, team });
      } else {
        noMatch.push(club.club_name);
      }
    }

    // 4. Create/update mappings
    let clubsMapped = 0;
    const newMappings: { club_id: string; provider_team_id: string }[] = [];
    for (const { club, team } of toMap) {
      try {
        const existing = existingMappings.filter((m: any) => m.club_id === club.id);
        const collision = existingMappings.find((m: any) =>
          m.club_id !== club.id &&
          String(m.provider_team_id || '') === String(team.id) &&
          m.mapping_status === 'verified'
        );
        const mappingStatus = collision ? 'ambiguous' : 'verified';
        const mappingData: any = {
          provider_team_id: team.id,
          provider_team_name: team.name,
          mapping_status: mappingStatus,
          verified_by: collision ? 'auto_collision_guard' : 'auto',
          last_sync_at: now,
        };
        if (!collision) mappingData.verified_at = now;

        if (existing.length > 0) {
          await asAdmin.entities.ClubProviderMapping.update(existing[0].id, mappingData);
        } else {
          await asAdmin.entities.ClubProviderMapping.create({
            organization_id, club_id: club.id, club_name: club.club_name, club_key: club.club_key,
            provider: "api_football", ...mappingData
          });
        }
        if (!collision) {
          newMappings.push({ club_id: club.id, provider_team_id: team.id });
          clubsMapped++;
        }
      } catch (err: any) {
        // skip
      }
    }

    // 5. Build team ID map (including new mappings)
    const teamIdMap = await buildTeamIdMap(base44, organization_id);

    // 6. Fetch fixtures for all mapped teams (sequential with delay to avoid 429)
    // Include both new mappings and existing ones that have no fixtures yet
    const allMappings = await asAdmin.entities.ClubProviderMapping.filter({ organization_id, provider: "api_football", mapping_status: "verified" });
    const existingFixturesPre = await asAdmin.entities.ClubFixture.filter({ organization_id, provider: "api_football" });
    const clubsWithFixtures = new Set<string>();
    for (const ef of existingFixturesPre) {
      for (const cid of ef.mapped_club_ids || []) clubsWithFixtures.add(cid);
    }
    const mappingCounts = new Map<string, number>();
    for (const m of allMappings) {
      const key = String(m.provider_team_id || '');
      mappingCounts.set(key, (mappingCounts.get(key) || 0) + 1);
    }
    const uniqueMappings = allMappings.filter((m: any) =>
      m.provider_team_id && mappingCounts.get(String(m.provider_team_id)) === 1
    );
    const mappingsToSync = uniqueMappings.filter((m: any) => !clubsWithFixtures.has(m.club_id));

    const allFixtures: any[] = [];
    let apiCalls = 0;
    const errors: string[] = [];
    let rateLimited = false;

    for (const m of mappingsToSync) {
      if (rateLimited) { errors.push(`${m.club_id}: skipped (rate limit reached)`); continue; }
      try {
        await new Promise(r => setTimeout(r, 300));
        let res = await fetch(`${baseUrl}/fixtures?team=${m.provider_team_id}&season=2026&timezone=America/Argentina/Buenos_Aires`, { headers });
        apiCalls++;
        if (res.status === 429) { rateLimited = true; errors.push(`${m.club_id}: HTTP 429 (rate limit)`); continue; }
        if (!res.ok) { errors.push(`${m.club_id}: HTTP ${res.status}`); continue; }
        let data = await res.json();
        let fixtures = data.response || [];
        if (fixtures.length === 0) {
          await new Promise(r => setTimeout(r, 300));
          res = await fetch(`${baseUrl}/fixtures?team=${m.provider_team_id}&season=2025&timezone=America/Argentina/Buenos_Aires`, { headers });
          apiCalls++;
          if (res.status === 429) { rateLimited = true; errors.push(`${m.club_id}: HTTP 429 (rate limit)`); continue; }
          if (res.ok) { data = await res.json(); fixtures = data.response || []; }
        }
        for (const fd of fixtures) {
          const homeId = String(fd.teams.home.id);
          const awayId = String(fd.teams.away.id);
          const mapped = [teamIdMap.get(homeId), teamIdMap.get(awayId)].filter(Boolean);
          allFixtures.push({
            organization_id, provider_fixture_id: String(fd.fixture.id), provider: "api_football",
            home_provider_team_id: homeId, away_provider_team_id: awayId,
            home_team_name: fd.teams.home.name, away_team_name: fd.teams.away.name,
            home_team_logo: fd.teams.home.logo, away_team_logo: fd.teams.away.logo,
            competition_name: fd.league.name, competition_logo: fd.league.logo, competition_id: String(fd.league.id),
            season: String(fd.league.season), round: fd.league.round,
            fixture_date: new Date(fd.fixture.date).toISOString(),
            stadium: fd.fixture.venue?.name || null, fixture_city: fd.fixture.venue?.city || null,
            fixture_status: fd.fixture.status?.short || null, fixture_status_long: fd.fixture.status?.long || null,
            home_score: fd.goals?.home ?? null, away_score: fd.goals?.away ?? null,
            mapped_club_ids: [...new Set(mapped)], last_sync_at: now,
          });
        }
      } catch (err: any) {
        errors.push(`${m.club_id}: ${sanitizeError(err.message)}`);
      }
    }

    // 7. Deduplicate against existing fixtures
    const existingFixtures = await asAdmin.entities.ClubFixture.filter({ organization_id, provider: "api_football" });
    const existingByFixtureId = new Map<string, any>();
    for (const ef of existingFixtures) {
      existingByFixtureId.set(ef.provider_fixture_id, ef);
    }

    const toCreate: any[] = [];
    const toUpdate: any[] = [];
    for (const f of allFixtures) {
      const existing = existingByFixtureId.get(f.provider_fixture_id);
      if (existing) {
        toUpdate.push({
          id: existing.id,
          ...f,
          mapped_club_ids: [...new Set(f.mapped_club_ids || [])],
        });
      } else {
        toCreate.push(f);
      }
    }

    // 8. BulkCreate new fixtures (batch of 400)
    let fixturesImported = 0;
    for (let i = 0; i < toCreate.length; i += 400) {
      const batch = toCreate.slice(i, i + 400);
      await asAdmin.entities.ClubFixture.bulkCreate(batch);
      fixturesImported += batch.length;
    }

    // 9. BulkUpdate existing fixtures (batch of 400)
    let fixturesUpdated = 0;
    for (let i = 0; i < toUpdate.length; i += 400) {
      const batch = toUpdate.slice(i, i + 400);
      await asAdmin.entities.ClubFixture.bulkUpdate(batch);
      fixturesUpdated += batch.length;
    }

    // 10. Create sync log
    await asAdmin.entities.FixtureSyncLog.create({
      organization_id, provider: "api_football", sync_type: "automated",
      queries_consumed: apiCalls, fixtures_imported: fixturesImported, fixtures_updated: fixturesUpdated,
      status: errors.length === 0 ? "success" : "partial", errors,
      sync_date: now
    });

    return Response.json({
      clubs_total: clubs.length,
      clubs_already_mapped: mappedClubIds.size,
      clubs_mapped: clubsMapped,
      clubs_no_match: noMatch.length,
      no_match_names: noMatch,
      fixtures_imported: fixturesImported,
      fixtures_updated: fixturesUpdated,
      api_calls: apiCalls,
      errors
    });
  } catch (error: any) {
    return Response.json({ error: sanitizeError(error.message) }, { status: 500 });
  }
}