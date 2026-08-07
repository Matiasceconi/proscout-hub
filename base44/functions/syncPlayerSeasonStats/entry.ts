import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { apiGetWithRetry, mapSeasonStats, sanitizeError } from '../../shared/statsUtils.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { player_id, organization_id, season } = body || {};
    if (!player_id || !organization_id) return Response.json({ error: "player_id y organization_id son obligatorios" }, { status: 400 });
    const s = season || "2026";

    const asAdmin = base44.asServiceRole;
    const identities = await asAdmin.entities.PlayerExternalIdentity.filter({ organization_id, player_id, provider: "api_football", status: "verified" });
    if (identities.length === 0) return Response.json({ error: "Jugador no vinculado al proveedor" }, { status: 400 });
    const identity = identities[0];

    const { data, rateLimit } = await apiGetWithRetry(`/players?id=${identity.provider_player_id}&season=${s}`);
    const apiPlayer = data.response?.[0];
    if (!apiPlayer) return Response.json({ error: "Sin datos para la temporada", success: false, rateLimit }, { status: 404 });

    let created = 0, updated = 0;
    const statsList = apiPlayer.statistics || [];
    for (const stat of statsList) {
      if (!stat.league?.id) continue;
      const mapped = mapSeasonStats(stat, organization_id, player_id, identity.provider_player_id, s);
      const existing = await asAdmin.entities.PlayerSeasonStatistic.filter({
        organization_id, player_id, provider: "api_football", season: s, league_id: String(stat.league.id)
      });
      if (existing.length > 0) {
        await asAdmin.entities.PlayerSeasonStatistic.update(existing[0].id, mapped);
        updated++;
      } else {
        await asAdmin.entities.PlayerSeasonStatistic.create(mapped);
        created++;
      }
    }

    await asAdmin.entities.PlayerExternalIdentity.update(identity.id, { last_checked_at: new Date().toISOString().slice(0, 10) });

    return Response.json({ success: true, created, updated, leagues_synced: statsList.length, rateLimit });
  } catch (error: any) {
    return Response.json({ error: sanitizeError(error.message || String(error)), success: false }, { status: 500 });
  }
}