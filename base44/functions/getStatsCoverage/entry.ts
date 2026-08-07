import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { sanitizeError } from '../../shared/statsUtils.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { organization_id } = body || {};
    if (!organization_id) return Response.json({ error: "organization_id es obligatorio" }, { status: 400 });

    const asAdmin = base44.asServiceRole;

    const [players, identities, matchStats, seasonStats, lastRuns] = await Promise.all([
      asAdmin.entities.Player.filter({ organization_id, status: { $ne: "archived" } }),
      asAdmin.entities.PlayerExternalIdentity.filter({ organization_id, provider: "api_football" }),
      asAdmin.entities.PlayerMatchStatistic.filter({ organization_id }, "-synced_at", 1),
      asAdmin.entities.PlayerSeasonStatistic.filter({ organization_id }, "-synced_at", 1),
      asAdmin.entities.StatisticsSyncRun.filter({ organization_id }, "-started_at", 1),
    ]);

    const identityByPlayer = new Map(identities.map(i => [i.player_id, i]));
    const linked = identities.filter(i => i.status === "verified");
    const pending = identities.filter(i => i.status === "pending");
    const ambiguous = identities.filter(i => i.status === "ambiguous");
    const errorIds = identities.filter(i => i.status === "error");
    const unlinked = players.filter(p => !identityByPlayer.has(p.id));

    const pendingPlayers = [
      ...unlinked.map(p => ({ player_id: p.id, name: `${p.first_name} ${p.last_name}`, club: p.club || null, reason: "sin_vincular" })),
      ...ambiguous.map(i => {
        const p = players.find(pl => pl.id === i.player_id);
        return { player_id: i.player_id, name: p ? `${p.first_name} ${p.last_name}` : "—", club: p?.club || null, reason: "ambiguo" };
      }),
      ...errorIds.map(i => {
        const p = players.find(pl => pl.id === i.player_id);
        return { player_id: i.player_id, name: p ? `${p.first_name} ${p.last_name}` : "—", club: p?.club || null, reason: "error" };
      }),
    ];

    const lastRun = lastRuns[0] || null;
    const lastMatchSync = matchStats[0]?.synced_at || null;
    const lastSeasonSync = seasonStats[0]?.synced_at || null;

    return Response.json({
      success: true,
      coverage: {
        total_players: players.length,
        linked: linked.length,
        pending: pending.length,
        ambiguous: ambiguous.length,
        error: errorIds.length,
        unlinked: unlinked.length,
      },
      pending_players: pendingPlayers,
      last_sync: {
        last_run: lastRun,
        last_match_stat_sync: lastMatchSync,
        last_season_stat_sync: lastSeasonSync,
      },
      match_stats_count: matchStats.length,
      season_stats_count: seasonStats.length,
    });
  } catch (error: any) {
    return Response.json({ error: sanitizeError(error.message || String(error)), success: false }, { status: 500 });
  }
}