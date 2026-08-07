import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { mapSeasonStats, mapMatchStats, sanitizeError, getApiKey, API_BASE_URL, parseRateLimit } from '../../shared/statsUtils.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { organization_id, season, scope, trigger_reason } = body || {};
    if (!organization_id) return Response.json({ error: "organization_id es obligatorio" }, { status: 400 });
    const s = season || "2026";
    const scp = scope || "all";

    const asAdmin = base44.asServiceRole;

    // Block duplicate runs
    const running = await asAdmin.entities.StatisticsSyncRun.filter({ organization_id, status: "running" });
    if (running.length > 0) return Response.json({ error: "Ya hay una sincronización en curso", run_id: running[0].id }, { status: 409 });

    const syncRun = await asAdmin.entities.StatisticsSyncRun.create({
      organization_id, scope: scp, started_at: new Date().toISOString(), status: "running",
      trigger_reason: trigger_reason || "manual", players_processed: 0, fixtures_processed: 0,
      records_created: 0, records_updated: 0, errors: [], api_requests_used: 0
    });

    let apiRequestsUsed = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let playersProcessed = 0;
    let fixturesProcessed = 0;
    const errors: string[] = [];
    let lastRateLimitRemaining: number | null = null;

    try {
      // Step 1: Buscar todos los PlayerExternalIdentity con filtro mínimo + filtrar en código
      const allIdentities = await asAdmin.entities.PlayerExternalIdentity.filter({
        organization_id
      });

      let identities = (allIdentities || []).filter(i => i.provider === "api_football" && i.status === "verified");
      if (scp === "pending") {
        identities = (allIdentities || []).filter(i => i.provider === "api_football" && (i.status === "pending" || i.status === "ambiguous"));
      }

      if (identities.length === 0) {
        await asAdmin.entities.StatisticsSyncRun.update(syncRun.id, {
          status: "completed", finished_at: new Date().toISOString(), errors: ["Sin jugadores vinculados"]
        });
        return Response.json({ success: true, run_id: syncRun.id, message: "Sin jugadores vinculados" });
      }

      // Step 2: Agrupar por provider_team_id
      const byTeam = new Map<string, any[]>();
      for (const ident of identities) {
        const teamId = ident.provider_team_id;
        if (!teamId) continue;
        if (!byTeam.has(teamId)) byTeam.set(teamId, []);
        byTeam.get(teamId)!.push(ident);
      }

      // Mapa de provider_player_id → identity para búsqueda rápida
      const identByPid = new Map<string, any>();
      for (const ident of identities) {
        if (ident.provider_player_id) identByPid.set(String(ident.provider_player_id), ident);
      }

      // Step 3: Para cada grupo, llamar a GET /players?team={team_id}&season={season}
      for (const [teamId, teamIdentities] of byTeam) {
        if (lastRateLimitRemaining !== null && lastRateLimitRemaining <= 5) {
          await new Promise(r => setTimeout(r, 3000));
        }
        try {
          const url = `${API_BASE_URL}/players?team=${teamId}&season=${s}`;
          const res = await fetch(url, { headers: { "x-apisports-key": getApiKey() } });
          const rateLimit = parseRateLimit(res.headers);
          apiRequestsUsed++;
          lastRateLimitRemaining = rateLimit.remaining;

          if (res.status === 429) {
            await new Promise(r => setTimeout(r, 5000));
            errors.push(`Team ${teamId}: Rate limit exceeded`);
            continue;
          }
          if (!res.ok) {
            const errBody = await res.text().catch(() => "");
            errors.push(`Team ${teamId}: API error ${res.status}`);
            continue;
          }

          const data = await res.json();

          // Step 4: Para cada jugador de la API, buscar PlayerExternalIdentity con ese provider_player_id
          for (const apiPlayer of data.response || []) {
            const providerPlayerId = String(apiPlayer.player?.id || "");
            const matchingIdent = identByPid.get(providerPlayerId);
            if (!matchingIdent) continue;

            // Step 5: Si coincide, crear/actualizar PlayerSeasonStatistic
            for (const stat of apiPlayer.statistics || []) {
              if (!stat.league?.id) continue;
              const league_id = String(stat.league.id);
              const mapped = mapSeasonStats(stat, organization_id, matchingIdent.player_id, providerPlayerId, s);

              // Buscar existente con filtro compuesto
              let existing = await asAdmin.entities.PlayerSeasonStatistic.filter({
                organization_id, player_id: matchingIdent.player_id, provider: "api_football", season: s, league_id
              });

              // Fallback: filtro simple + filtrar en código
              if (!existing || existing.length === 0) {
                const allByPlayer = await asAdmin.entities.PlayerSeasonStatistic.filter({
                  organization_id, player_id: matchingIdent.player_id, season: s
                });
                existing = (allByPlayer || []).filter(r =>
                  r.provider === "api_football" && String(r.league_id) === league_id
                );
              }

              if (existing && existing.length > 0) {
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

      // Sync fixture stats for finished fixtures
      const finishedFixtures = await asAdmin.entities.ClubFixture.filter({
        organization_id, fixture_status: "FT"
      }, "-fixture_date", 50);

      for (const fx of finishedFixtures) {
        if (lastRateLimitRemaining !== null && lastRateLimitRemaining <= 3) {
          await new Promise(r => setTimeout(r, 5000));
        }
        try {
          const clubIds = fx.mapped_club_ids || [];
          if (clubIds.length === 0) continue;
          const players = await asAdmin.entities.Player.filter({ organization_id, status: { $ne: "archived" } });
          const relevantPlayers = players.filter(p => p.current_club_id && clubIds.includes(p.current_club_id));
          if (relevantPlayers.length === 0) continue;
          const playerIds = relevantPlayers.map(p => p.id);

          // Filtro simple + filtrar en código
          const allFxIdentities = await asAdmin.entities.PlayerExternalIdentity.filter({
            organization_id, player_id: { $in: playerIds }, provider: "api_football"
          });
          const fxIdentities = (allFxIdentities || []).filter(i => i.status === "verified");
          if (fxIdentities.length === 0) continue;

          const fxUrl = `${API_BASE_URL}/fixtures/players?fixture=${fx.provider_fixture_id}`;
          const res = await fetch(fxUrl, { headers: { "x-apisports-key": getApiKey() } });
          const rateLimit = parseRateLimit(res.headers);
          apiRequestsUsed++;
          lastRateLimitRemaining = rateLimit.remaining;

          if (res.status === 429 || !res.ok) continue;

          const data = await res.json();
          const fixtureData = data.response?.[0];
          if (!fixtureData) continue;

          const fullFixture = {
            fixture: { id: fx.provider_fixture_id, date: fx.fixture_date },
            league: { id: fx.competition_id, season: fx.season },
            teams: { home: { id: fx.home_provider_team_id }, away: { id: fx.away_provider_team_id } },
          };
          const identByPlayerId = new Map(fxIdentities.map(i => [i.player_id, i]));

          for (const teamData of fixtureData.players || []) {
            for (const ps of teamData.players || []) {
              const ppid = String(ps.player?.id || "");
              let matchPid = null;
              for (const [pid, ident] of identByPlayerId) {
                if (ident.provider_player_id === ppid) { matchPid = pid; break; }
              }
              if (!matchPid) continue;
              const mapped = mapMatchStats(ps, fullFixture, organization_id, matchPid, ppid);

              let existing = await asAdmin.entities.PlayerMatchStatistic.filter({
                organization_id, provider: "api_football", provider_fixture_id: fx.provider_fixture_id, player_id: matchPid
              });

              if (!existing || existing.length === 0) {
                const allByFixture = await asAdmin.entities.PlayerMatchStatistic.filter({
                  organization_id, provider_fixture_id: fx.provider_fixture_id
                });
                existing = (allByFixture || []).filter(r => r.player_id === matchPid && r.provider === "api_football");
              }

              if (existing && existing.length > 0) {
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
        players_processed: playersProcessed,
        fixtures_processed: fixturesProcessed,
        records_created: recordsCreated,
        records_updated: recordsUpdated,
        errors, api_requests_used: apiRequestsUsed
      });

      return Response.json({
        success: true, run_id: syncRun.id,
        players_processed: playersProcessed, fixtures_processed: fixturesProcessed,
        records_created: recordsCreated, records_updated: recordsUpdated,
        errors, api_requests_used: apiRequestsUsed,
        rate_limit_remaining: lastRateLimitRemaining
      });
    } catch (fatal: any) {
      await asAdmin.entities.StatisticsSyncRun.update(syncRun.id, {
        status: "failed", finished_at: new Date().toISOString(),
        errors: [sanitizeError(fatal.message || String(fatal))], api_requests_used: apiRequestsUsed
      });
      return Response.json({ error: sanitizeError(fatal.message || String(fatal)), success: false, run_id: syncRun.id }, { status: 500 });
    }
  } catch (error: any) {
    return Response.json({ error: sanitizeError(error.message || String(error)), success: false }, { status: 500 });
  }
}