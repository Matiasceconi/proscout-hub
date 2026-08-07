import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { mapSeasonStats, sanitizeError, getApiKey, API_BASE_URL, parseRateLimit } from '../../shared/statsUtils.ts';

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

    // Step 1-3: Buscar PlayerExternalIdentity con filtro mínimo + filtrar en código
    const allIdentities = await asAdmin.entities.PlayerExternalIdentity.filter({
      organization_id, player_id
    });
    const identity = (allIdentities || []).find(i => i.provider === "api_football" && i.status === "verified")
      || (allIdentities || []).find(i => i.provider === "api_football")
      || null;

    if (!identity || !identity.provider_player_id) {
      return Response.json({
        error: "Jugador no vinculado al proveedor",
        success: false,
        debug: { organization_id, player_id, identities_found: allIdentities?.length || 0 }
      }, { status: 400 });
    }

    const provider_player_id = identity.provider_player_id;

    // Step 4: Llamar a la API directamente
    const url = `${API_BASE_URL}/players?id=${provider_player_id}&season=${s}`;
    const res = await fetch(url, { headers: { "x-apisports-key": getApiKey() } });
    const rateLimit = parseRateLimit(res.headers);

    if (res.status === 429) {
      return Response.json({ error: "Rate limit exceeded", success: false, rateLimit }, { status: 429 });
    }
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      return Response.json({ error: `API error ${res.status}: ${errBody.slice(0, 200)}`, success: false, url_llamada: url }, { status: 502 });
    }

    const data = await res.json();

    // Step 5: Si response.response tiene 0 elementos, devolver debug
    if (!data.response || data.response.length === 0) {
      return Response.json({
        error: "Sin datos para la temporada",
        success: false,
        provider_player_id,
        season: s,
        url_llamada: url,
        rateLimit
      }, { status: 404 });
    }

    const apiPlayer = data.response[0];

    // Step 6: Para cada statistics[], crear/actualizar PlayerSeasonStatistic
    let created = 0, updated = 0;
    const statsList = apiPlayer.statistics || [];

    for (const stat of statsList) {
      if (!stat.league?.id) continue;
      const league_id = String(stat.league.id);
      const mapped = mapSeasonStats(stat, organization_id, player_id, provider_player_id, s);

      // Step 8: Buscar existente con filtro mínimo + filtrar en código
      const allByPlayer = await asAdmin.entities.PlayerSeasonStatistic.filter({
        organization_id, player_id
      });
      const existing = (allByPlayer || []).filter(r =>
        r.provider === "api_football" && r.season === s && String(r.league_id) === league_id
      );

      // Step 9: Si encuentra, actualizar. Si no, crear.
      if (existing && existing.length > 0) {
        await asAdmin.entities.PlayerSeasonStatistic.update(existing[0].id, mapped);
        updated++;
      } else {
        await asAdmin.entities.PlayerSeasonStatistic.create(mapped);
        created++;
      }
    }

    // Actualizar last_checked_at en la identidad
    await asAdmin.entities.PlayerExternalIdentity.update(identity.id, {
      last_checked_at: new Date().toISOString().slice(0, 10)
    });

    return Response.json({
      success: true,
      created,
      updated,
      leagues_synced: statsList.length,
      provider_player_id,
      player_name: apiPlayer.player?.name || null,
      rateLimit
    });
  } catch (error: any) {
    return Response.json({ error: sanitizeError(error.message || String(error)), success: false }, { status: 500 });
  }
}