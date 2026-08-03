import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { upsertFixture, buildTeamIdMap, sanitizeError } from '../../shared/fixtureUtils.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { organization_id, club_id, provider_team_id, sync_type } = body || {};
    if (!organization_id || !provider_team_id) return Response.json({ error: "organization_id y provider_team_id son obligatorios" }, { status: 400 });

    const apiKey = secrets.get("API_FOOTBALL_KEY");
    if (!apiKey) return Response.json({ error: "API_FOOTBALL_KEY no configurada" }, { status: 500 });

    const asAdmin = base44.asServiceRole;
    const baseUrl = "https://v3.football.api-sports.io";
    const headers = { "x-apisports-key": apiKey };
    let queriesUsed = 0, fixturesImported = 0, fixturesUpdated = 0;
    let rateLimitRemaining: number | null = null, rateLimitTotal: number | null = null;
    let errors: any[] = [];

    const teamIdToClubId = await buildTeamIdMap(base44, organization_id);

    const nextRes = await fetch(`${baseUrl}/fixtures?team=${provider_team_id}&next=15&timezone=America/Argentina/Buenos_Aires`, { headers });
    queriesUsed++;
    rateLimitRemaining = nextRes.headers.get("x-ratelimit-remaining") ? parseInt(nextRes.headers.get("x-ratelimit-remaining")!) : null;
    rateLimitTotal = nextRes.headers.get("x-ratelimit-limit") ? parseInt(nextRes.headers.get("x-ratelimit-limit")!) : null;
    if (!nextRes.ok) { errors.push({ endpoint: "fixtures?next=15", status: nextRes.status }); }
    else {
      const nextData = await nextRes.json();
      for (const f of nextData.response || []) {
        const result = await upsertFixture(base44, f, organization_id, "api_football", teamIdToClubId, club_id);
        if (result === "created") fixturesImported++; else if (result === "updated") fixturesUpdated++;
      }
    }

    const lastRes = await fetch(`${baseUrl}/fixtures?team=${provider_team_id}&last=10&timezone=America/Argentina/Buenos_Aires`, { headers });
    queriesUsed++;
    rateLimitRemaining = lastRes.headers.get("x-ratelimit-remaining") ? parseInt(lastRes.headers.get("x-ratelimit-remaining")!) : rateLimitRemaining;
    if (!lastRes.ok) { errors.push({ endpoint: "fixtures?last=10", status: lastRes.status }); }
    else {
      const lastData = await lastRes.json();
      for (const f of lastData.response || []) {
        const result = await upsertFixture(base44, f, organization_id, "api_football", teamIdToClubId, club_id);
        if (result === "created") fixturesImported++; else if (result === "updated") fixturesUpdated++;
      }
    }

    const mappings = await asAdmin.entities.ClubProviderMapping.filter({ organization_id, club_id, provider: "api_football" });
    if (mappings.length > 0) await asAdmin.entities.ClubProviderMapping.update(mappings[0].id, { last_sync_at: new Date().toISOString() });

    const syncStatus = errors.length === 0 ? "success" : errors.length === 2 ? "error" : "partial";
    await asAdmin.entities.FixtureSyncLog.create({
      organization_id, club_id, provider: "api_football", sync_type: sync_type || "manual",
      queries_consumed: queriesUsed, queries_remaining: rateLimitRemaining,
      rate_limit: rateLimitTotal?.toString() || null,
      fixtures_imported: fixturesImported, fixtures_updated: fixturesUpdated,
      status: syncStatus, errors: errors.map(e => JSON.stringify(e)),
      sync_date: new Date().toISOString()
    });

    return Response.json({ success: syncStatus !== "error", queries_used: queriesUsed, queries_remaining: rateLimitRemaining, rate_limit_total: rateLimitTotal, fixtures_imported: fixturesImported, fixtures_updated: fixturesUpdated, errors, status: syncStatus });
  } catch (error: any) {
    return Response.json({ error: sanitizeError(error.message), success: false }, { status: 500 });
  }
}