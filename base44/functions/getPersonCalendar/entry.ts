import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { person_type, person_id, organization_id } = body || {};
    if (!person_type || !person_id || !organization_id)
      return Response.json({ error: "person_type, person_id y organization_id son obligatorios" }, { status: 400 });

    const asAdmin = base44.asServiceRole;
    const entityName = person_type === "player" ? "Player" : "TechnicalDirector";
    const person = await asAdmin.entities[entityName].get(person_id);
    if (!person) return Response.json({ error: "Persona no encontrada" }, { status: 404 });

    const base = { person_type, person_id, organization_id };

    // 1. Single source of truth: current_club_id first
    let club: any = null;
    if (person.current_club_id) {
      try { club = await asAdmin.entities.Club.get(person.current_club_id); } catch { /* invalid ref */ }
    }

    // 2. Fallback: resolve from career entries
    if (!club) {
      let careerRecords: any[] = [];
      if (person_type === "player") {
        careerRecords = await asAdmin.entities.PlayerCareerEntry.filter({ player_id: person_id, organization_id, is_current: true });
      } else {
        careerRecords = await asAdmin.entities.DirectorCareer.filter({ director_id: person_id, organization_id, is_current: true });
      }
      const verifiedCurrent = careerRecords.filter((r: any) => r.current_stage === "ACTUAL");

      if (verifiedCurrent.length === 1) {
        const career = verifiedCurrent[0];
        if (career.club_key) {
          const clubs = await asAdmin.entities.Club.filter({ club_key: career.club_key });
          if (clubs.length > 0) {
            club = clubs[0];
            await asAdmin.entities[entityName].update(person_id, { current_club_id: club.id });
          } else {
            return Response.json({ ...base, status: "club_pending", club_name: career.club, club_key: career.club_key, fixtures: [], last_results: [], next_fixtures: [], last_sync: null, message: "La trayectoria indica un club que no tiene registro interno" });
          }
        } else {
          return Response.json({ ...base, status: "club_pending", club_name: career.club, club_key: null, fixtures: [], last_results: [], next_fixtures: [], last_sync: null, message: "La trayectoria indica un club que no tiene registro interno" });
        }
      } else if (verifiedCurrent.length > 1) {
        const options = await Promise.all(verifiedCurrent.map(async (r) => {
          const clubs = r.club_key ? await asAdmin.entities.Club.filter({ club_key: r.club_key }) : [];
          return { career_id: r.id, club_id: clubs[0]?.id, club_name: r.club, club_key: r.club_key, start_date: r.start_date };
        }));
        return Response.json({ ...base, status: "ambiguous", options, fixtures: [], last_results: [], next_fixtures: [], last_sync: null, message: "Hay mas de una etapa actual" });
      }
    }

    // 3. No club at all
    if (!club) return Response.json({ ...base, status: "sin_club", club: null, fixtures: [], last_results: [], next_fixtures: [], last_sync: null, message: "Esta persona no tiene un club actual vinculado" });

    // 4. Check API-Football mapping
    const mappings = await asAdmin.entities.ClubProviderMapping.filter({ organization_id, club_id: club.id, provider: "api_football", mapping_status: "verified" });
    if (mappings.length === 0) return Response.json({ ...base, status: "no_mapping", club: { id: club.id, club_name: club.club_name, club_key: club.club_key, internal_logo_url: club.internal_logo_url }, fixtures: [], last_results: [], next_fixtures: [], last_sync: null, message: "El club no esta vinculado con API-Football" });

    // 5. Check fixtures
    const mapping = mappings[0];
    const allFixtures = await asAdmin.entities.ClubFixture.filter({ organization_id, provider: "api_football" });
    const clubFixtures = allFixtures.filter((f: any) => f.mapped_club_ids && f.mapped_club_ids.includes(club.id));
    const providerTeamId = mapping.provider_team_id;

    if (clubFixtures.length === 0) {
      const syncLogs = await asAdmin.entities.FixtureSyncLog.filter({ organization_id, club_id: club.id });
      const hasSync = syncLogs.length > 0;
      return Response.json({ ...base, status: hasSync ? "no_coverage" : "no_fixtures", club: { id: club.id, club_name: club.club_name, club_key: club.club_key, internal_logo_url: club.internal_logo_url }, provider_mapping: { provider_team_id: mapping.provider_team_id, provider_team_name: mapping.provider_team_name }, fixtures: [], last_results: [], next_fixtures: [], last_sync: null, message: hasSync ? "API-Football no dispone de calendario para este club" : "Fixture pendiente de sincronizacion" });
    }

    // 6. All good
    const fixturesWithRole = clubFixtures.map((f: any) => ({
      ...f, is_home: f.home_provider_team_id === providerTeamId,
      role: f.home_provider_team_id === providerTeamId ? "local" : "visitante",
      opponent: f.home_provider_team_id === providerTeamId ? f.away_team_name : f.home_team_name,
      opponent_logo: f.home_provider_team_id === providerTeamId ? f.away_team_logo : f.home_team_logo,
      team_logo: f.home_provider_team_id === providerTeamId ? f.home_team_logo : f.away_team_logo,
      result: ["FT", "AET", "PEN"].includes(f.fixture_status) ? `${f.home_score}-${f.away_score}` : null
    }));
    const now = new Date();
    const past = fixturesWithRole.filter((f: any) => new Date(f.fixture_date) < now && f.result).sort((a: any, b: any) => new Date(b.fixture_date).getTime() - new Date(a.fixture_date).getTime()).slice(0, 10);
    const upcoming = fixturesWithRole.filter((f: any) => new Date(f.fixture_date) >= now).sort((a: any, b: any) => new Date(a.fixture_date).getTime() - new Date(b.fixture_date).getTime()).slice(0, 15);
    const nextMatch = upcoming.length > 0 ? upcoming[0] : null;

    const syncLogs = await asAdmin.entities.FixtureSyncLog.filter({ organization_id, club_id: club.id, status: "success" });
    const lastSync = syncLogs.length > 0 ? [...syncLogs].sort((a: any, b: any) => new Date(b.sync_date).getTime() - new Date(a.sync_date).getTime())[0] : null;

    return Response.json({ ...base, status: "ok", club: { id: club.id, club_name: club.club_name, club_key: club.club_key, internal_logo_url: club.internal_logo_url }, provider_mapping: { provider_team_id: mapping.provider_team_id, provider_team_name: mapping.provider_team_name, mapping_status: mapping.mapping_status, last_sync_at: mapping.last_sync_at }, next_match: nextMatch, last_results: past, next_fixtures: upcoming, all_fixtures: fixturesWithRole, last_sync: lastSync ? { sync_date: lastSync.sync_date, queries_consumed: lastSync.queries_consumed, queries_remaining: lastSync.queries_remaining, fixtures_imported: lastSync.fixtures_imported, fixtures_updated: lastSync.fixtures_updated } : null });
  } catch (error: any) {
    return Response.json({ error: error.message?.replace(/key=[^&]+/g, "key=***") }, { status: 500 });
  }
}