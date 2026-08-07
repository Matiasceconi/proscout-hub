import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { apiGetWithRetry, mapSeasonStats, mapMatchStats, sanitizeError } from '../../shared/statsUtils.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const asAdmin = base44.asServiceRole;

    // Auth: allow workflow calls (no user) or admin users
    let isAuthorized = false;
    try {
      const user = await base44.auth.me();
      if (user) {
        if (user.role === "admin" || user.data?.role === "organization_owner" || user.data?.role === "organization_admin") isAuthorized = true;
        else return Response.json({ error: "Forbidden" }, { status: 403 });
      } else {
        isAuthorized = true; // workflow call (no user session)
      }
    } catch {
      isAuthorized = true; // no auth context = workflow call
    }
    if (!isAuthorized) return Response.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const season = body?.season || "2026";
    const organization_id = body?.organization_id || null;

    // Find all organizations (or use specific one)
    const orgs = organization_id
      ? await asAdmin.entities.Organization.filter({ id: organization_id })
      : await asAdmin.entities.Organization.filter({ status: "active" });

    const results = [];

    for (const org of orgs) {
      const orgId = org.id;
      let apiRequestsUsed = 0;
      let recordsCreated = 0;
      let recordsUpdated = 0;
      let playersProcessed = 0;
      let fixturesProcessed = 0;
      const errors: string[] = [];
      let lastRateLimitRemaining: number | null = null;

      try {
        // Block duplicate runs for this org
        const running = await asAdmin.entities.StatisticsSyncRun.filter({ organization_id: orgId, status: "running" });
        if (running.length > 0) {
          results.push({ org: org.name, skipped: true, reason: "already_running" });
          continue;
        }

        const syncRun = await asAdmin.entities.StatisticsSyncRun.create({
          organization_id: orgId, scope: "all", started_at: new Date().toISOString(), status: "running",
          trigger_reason: "scheduled_daily", players_processed: 0, fixtures_processed: 0,
          records_created: 0, records_updated: 0, errors: [], api_requests_used: 0
        });

        // Get all verified identities
        const identities = await asAdmin.entities.PlayerExternalIdentity.filter({ organization_id: orgId, provider: "api_football", status: "verified" });
        if (identities.length === 0) {
          await asAdmin.entities.StatisticsSyncRun.update(syncRun.id, {
            status: "completed", finished_at: new Date().toISOString(), errors: ["Sin jugadores vinculados"]
          });
          results.push({ org: org.name, skipped: true, reason: "no_linked_players" });
          continue;
        }

        // Group by team
        const byTeam = new Map<string, any[]>();
        for (const ident of identities) {
          if (!ident.provider_team_id) continue;
          if (!byTeam.has(ident.provider_team_id)) byTeam.set(ident.provider_team_id, []);
          byTeam.get(ident.provider_team_id)!.push(ident);
        }

        // Sync season stats per team
        for (const [teamId, teamIdentities] of byTeam) {
          if (lastRateLimitRemaining !== null && lastRateLimitRemaining <= 5) {
            await new Promise(r => setTimeout(r, 3000));
          }
          try {
            const { data, rateLimit } = await apiGetWithRetry(`/players?team=${teamId}&season=${season}`);
            apiRequestsUsed++;
            lastRateLimitRemaining = rateLimit.remaining;

            for (const apiPlayer of data.response || []) {
              const providerPlayerId = String(apiPlayer.player?.id || "");
              const matchingIdent = teamIdentities.find(i => i.provider_player_id === providerPlayerId);
              if (!matchingIdent) continue;

              for (const stat of apiPlayer.statistics || []) {
                if (!stat.league?.id) continue;
                const mapped = mapSeasonStats(stat, orgId, matchingIdent.player_id, providerPlayerId, season);
                const existing = await asAdmin.entities.PlayerSeasonStatistic.filter({
                  organization_id: orgId, player_id: matchingIdent.player_id, provider: "api_football", season, league_id: String(stat.league.id)
                });
                if (existing.length > 0) {
                  await asAdmin.entities.PlayerSeasonStatistic.update(existing[0].id, mapped);
                  recordsUpdated++;
                } else {
                  await asAdmin.entities.PlayerSeasonStatistic.create(mapped);
                  recordsCreated++;
                }
              }
              playersProcessed++;
            }
          } catch (err: any) {
            errors.push(`Team ${teamId}: ${sanitizeError(err.message || String(err))}`);
          }
        }

        // Sync finished fixtures
        const finishedFixtures = await asAdmin.entities.ClubFixture.filter({ organization_id: orgId, fixture_status: "FT" }, "-fixture_date", 30);
        for (const fx of finishedFixtures) {
          if (lastRateLimitRemaining !== null && lastRateLimitRemaining <= 3) {
            await new Promise(r => setTimeout(r, 5000));
          }
          try {
            const clubIds = fx.mapped_club_ids || [];
            if (clubIds.length === 0) continue;
            const players = await asAdmin.entities.Player.filter({ organization_id: orgId, status: { $ne: "archived" } });
            const relevantPlayers = players.filter(p => p.current_club_id && clubIds.includes(p.current_club_id));
            if (relevantPlayers.length === 0) continue;
            const playerIds = relevantPlayers.map(p => p.id);
            const fxIdentities = await asAdmin.entities.PlayerExternalIdentity.filter({ organization_id: orgId, player_id: { $in: playerIds }, provider: "api_football", status: "verified" });
            if (fxIdentities.length === 0) continue;

            const { data } = await apiGetWithRetry(`/fixtures/players?fixture=${fx.provider_fixture_id}`);
            apiRequestsUsed++;
            const fixtureData = data.response?.[0];
            if (!fixtureData) continue;

            const fullFixture = {
              fixture: { id: fx.provider_fixture_id, date: fx.fixture_date },
              league: { id: fx.competition_id, season: fx.season },
              teams: { home: { id: fx.home_provider_team_id }, away: { id: fx.away_provider_team_id } },
            };
            const identByPid = new Map(fxIdentities.map(i => [i.player_id, i]));

            for (const teamData of fixtureData.players || []) {
              for (const ps of teamData.players || []) {
                const ppid = String(ps.player?.id || "");
                let matchPid = null;
                for (const [pid, ident] of identByPid) {
                  if (ident.provider_player_id === ppid) { matchPid = pid; break; }
                }
                if (!matchPid) continue;
                const mapped = mapMatchStats(ps, fullFixture, orgId, matchPid, ppid);
                const existing = await asAdmin.entities.PlayerMatchStatistic.filter({
                  organization_id: orgId, provider: "api_football", provider_fixture_id: fx.provider_fixture_id, player_id: matchPid
                });
                if (existing.length > 0) {
                  await asAdmin.entities.PlayerMatchStatistic.update(existing[0].id, mapped);
                  recordsUpdated++;
                } else {
                  await asAdmin.entities.PlayerMatchStatistic.create(mapped);
                  recordsCreated++;
                }
              }
            }
            fixturesProcessed++;
          } catch (err: any) {
            errors.push(`Fixture ${fx.provider_fixture_id}: ${sanitizeError(err.message || String(err))}`);
          }
        }

        await asAdmin.entities.StatisticsSyncRun.update(syncRun.id, {
          status: errors.length === 0 ? "completed" : "partial",
          finished_at: new Date().toISOString(),
          players_processed: playersProcessed, fixtures_processed: fixturesProcessed,
          records_created: recordsCreated, records_updated: recordsUpdated,
          errors, api_requests_used: apiRequestsUsed
        });

        results.push({ org: org.name, status: errors.length === 0 ? "completed" : "partial", players_processed: playersProcessed, records_created: recordsCreated, records_updated: recordsUpdated, errors: errors.length });
      } catch (orgErr: any) {
        results.push({ org: org.name, status: "failed", error: sanitizeError(orgErr.message || String(orgErr)) });
      }
    }

    return Response.json({ success: true, results, organizations_processed: orgs.length });
  } catch (error: any) {
    return Response.json({ error: sanitizeError(error.message || String(error)), success: false }, { status: 500 });
  }
}