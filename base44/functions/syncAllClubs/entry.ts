import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { upsertFixture, buildTeamIdMap, sanitizeError } from '../../shared/fixtureUtils.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { organization_id, sync_type } = body || {};
    if (!organization_id) return Response.json({ error: "organization_id es obligatorio" }, { status: 400 });

    const asAdmin = base44.asServiceRole;
    const mappings = await asAdmin.entities.ClubProviderMapping.filter({ organization_id, provider: "api_football", mapping_status: "verified" });
    if (mappings.length === 0) return Response.json({ success: true, message: "No hay clubes verificados para sincronizar", synced_clubs: 0 });

    // Skip clubs that already have fixtures (unless force=true)
    const force = body?.force === true;
    const existingFixtures = force ? [] : await asAdmin.entities.ClubFixture.filter({ organization_id, provider: "api_football" });
    const clubsWithFixtures = new Set<string>();
    for (const f of existingFixtures) {
      for (const cid of f.mapped_club_ids || []) clubsWithFixtures.add(cid);
    }
    const toSync = mappings.filter((m: any) => !clubsWithFixtures.has(m.club_id));
    const skipped = mappings.length - toSync.length;
    if (toSync.length === 0) return Response.json({ success: true, synced_clubs: 0, skipped, message: "Todos los clubes ya tienen fixtures", total_queries: 0, total_fixtures: 0, total_errors: 0, results: [] });

    const results: any[] = [];
    let totalQueries = 0, totalFixtures = 0, totalErrors = 0;
    let rateLimitRemaining: number | null = null;
    let stopped = false;

    for (const mapping of toSync) {
      if (stopped) break;
      try {
        const syncRes = await syncSingleClub(base44, organization_id, mapping.club_id, mapping.provider_team_id, sync_type || "automated");
        results.push({ club_id: mapping.club_id, club_name: mapping.club_name, ...syncRes });
        totalQueries += syncRes.queries_used || 0;
        totalFixtures += (syncRes.fixtures_imported || 0) + (syncRes.fixtures_updated || 0);
        if (!syncRes.success) totalErrors++;
        rateLimitRemaining = syncRes.queries_remaining ?? rateLimitRemaining;
        // Stop if rate limit is low or exhausted
        if (rateLimitRemaining !== null && rateLimitRemaining < 10) { stopped = true; break; }
        if (syncRes.errors?.some((e: any) => e.status === 429)) { stopped = true; break; }
        // Delay between clubs to avoid rate limiting
        await new Promise(r => setTimeout(r, 1500));
      } catch (err: any) {
        results.push({ club_id: mapping.club_id, club_name: mapping.club_name, success: false, error: sanitizeError(err.message) });
        totalErrors++;
      }
    }

    return Response.json({ success: totalErrors === 0, synced_clubs: results.length, skipped, stopped, total_queries: totalQueries, total_fixtures: totalFixtures, total_errors: totalErrors, results });
  } catch (error: any) {
    return Response.json({ error: sanitizeError(error.message) }, { status: 500 });
  }
}

async function syncSingleClub(base44: any, organization_id: string, club_id: string, provider_team_id: string, sync_type: string) {
  const apiKey = secrets.get("API_FOOTBALL_KEY");
  if (!apiKey) return { success: false, error: "API_FOOTBALL_KEY not configured", queries_used: 0 };

  const asAdmin = base44.asServiceRole;
  const baseUrl = "https://v3.football.api-sports.io";
  const headers = { "x-apisports-key": apiKey };
  let queriesUsed = 0, fixturesImported = 0, fixturesUpdated = 0, rateLimitRemaining: number | null = null;
  let errors: any[] = [];

  const teamIdToClubId = await buildTeamIdMap(base44, organization_id);

  try {
    const nextRes = await fetch(`${baseUrl}/fixtures?team=${provider_team_id}&next=15&timezone=America/Argentina/Buenos_Aires`, { headers });
    queriesUsed++;
    rateLimitRemaining = nextRes.headers.get("x-ratelimit-remaining") ? parseInt(nextRes.headers.get("x-ratelimit-remaining")!) : null;
    if (nextRes.ok) {
      const d = await nextRes.json();
      for (const f of d.response || []) {
        const r = await upsertFixture(base44, f, organization_id, "api_football", teamIdToClubId, club_id);
        if (r === "created") fixturesImported++; else if (r === "updated") fixturesUpdated++;
      }
    } else errors.push({ endpoint: "next", status: nextRes.status });

    const lastRes = await fetch(`${baseUrl}/fixtures?team=${provider_team_id}&last=10&timezone=America/Argentina/Buenos_Aires`, { headers });
    queriesUsed++;
    if (lastRes.ok) {
      const d = await lastRes.json();
      for (const f of d.response || []) {
        const r = await upsertFixture(base44, f, organization_id, "api_football", teamIdToClubId, club_id);
        if (r === "created") fixturesImported++; else if (r === "updated") fixturesUpdated++;
      }
    } else errors.push({ endpoint: "last", status: lastRes.status });

    const clubMappings = await asAdmin.entities.ClubProviderMapping.filter({ organization_id, club_id, provider: "api_football" });
    if (clubMappings.length > 0) await asAdmin.entities.ClubProviderMapping.update(clubMappings[0].id, { last_sync_at: new Date().toISOString() });

    const status = errors.length === 0 ? "success" : errors.length === 2 ? "error" : "partial";
    await asAdmin.entities.FixtureSyncLog.create({
      organization_id, club_id, provider: "api_football", sync_type,
      queries_consumed: queriesUsed, queries_remaining: rateLimitRemaining,
      fixtures_imported: fixturesImported, fixtures_updated: fixturesUpdated,
      status, errors: errors.map(e => JSON.stringify(e)),
      sync_date: new Date().toISOString()
    });

    return { success: status !== "error", queries_used: queriesUsed, queries_remaining: rateLimitRemaining, fixtures_imported: fixturesImported, fixtures_updated: fixturesUpdated, errors };
  } catch (err: any) {
    await asAdmin.entities.FixtureSyncLog.create({
      organization_id, club_id, provider: "api_football", sync_type,
      queries_consumed: queriesUsed, queries_remaining: rateLimitRemaining,
      status: "error", errors: [sanitizeError(err.message)],
      sync_date: new Date().toISOString()
    });
    return { success: false, error: sanitizeError(err.message), queries_used: queriesUsed };
  }
}