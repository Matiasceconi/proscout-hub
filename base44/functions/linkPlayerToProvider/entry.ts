import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { apiGetWithRetry, mapSeasonStats, sanitizeError } from '../../shared/statsUtils.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { player_id, organization_id, provider_player_id, provider_team_id, verified_by } = body || {};
    if (!player_id || !organization_id || !provider_player_id) {
      return Response.json({ error: "player_id, organization_id y provider_player_id son obligatorios" }, { status: 400 });
    }

    const asAdmin = base44.asServiceRole;
    const player = await asAdmin.entities.Player.filter({ id: player_id, organization_id });
    if (!player || player.length === 0) return Response.json({ error: "Jugador no encontrado" }, { status: 404 });
    const p = player[0];

    // Validate player exists in API-Football
    const { data } = await apiGetWithRetry(`/players?id=${provider_player_id}&season=2026`);
    const apiPlayer = data.response?.[0];
    if (!apiPlayer) return Response.json({ error: "Jugador no encontrado en API-Football" }, { status: 404 });

    const leagueIds = (apiPlayer.statistics || []).map(s => String(s.league?.id || "")).filter(Boolean);

    // Upsert PlayerExternalIdentity
    const existing = await asAdmin.entities.PlayerExternalIdentity.filter({ organization_id, player_id, provider: "api_football" });
    const identityData = {
      organization_id, player_id, provider: "api_football",
      provider_player_id: String(provider_player_id),
      provider_team_id: provider_team_id || String(apiPlayer.statistics?.[0]?.team?.id || ""),
      provider_league_ids: leagueIds,
      provider_player_name: apiPlayer.player?.name || null,
      provider_photo_url: apiPlayer.player?.photo || null,
      status: "verified",
      verification_method: "admin_confirmed",
      verified_by: verified_by || user.id,
      verified_at: new Date().toISOString().slice(0, 10),
      last_checked_at: new Date().toISOString().slice(0, 10),
    };

    let identity;
    if (existing.length > 0) {
      await asAdmin.entities.PlayerExternalIdentity.update(existing[0].id, identityData);
      identity = { ...existing[0], ...identityData };
    } else {
      identity = await asAdmin.entities.PlayerExternalIdentity.create({ ...identityData, notes: null });
    }

    // Update Player photo/nationality/height/weight if missing
    const playerUpdates: any = {};
    if (!p.photo_url && apiPlayer.player?.photo) playerUpdates.photo_url = apiPlayer.player.photo;
    if (!p.nationality && apiPlayer.player?.nationality) playerUpdates.nationality = apiPlayer.player.nationality;
    if (!p.height && apiPlayer.player?.height) {
      const h = parseInt(apiPlayer.player.height?.replace(/\D/g, ""));
      if (!isNaN(h) && h > 100) playerUpdates.height = h;
    }
    if (!p.weight && apiPlayer.player?.weight) {
      const w = parseInt(apiPlayer.player.weight?.replace(/\D/g, ""));
      if (!isNaN(w) && w > 30) playerUpdates.weight = w;
    }
    if (Object.keys(playerUpdates).length > 0) {
      await asAdmin.entities.Player.update(player_id, playerUpdates);
    }

    return Response.json({ success: true, identity, player_updated: Object.keys(playerUpdates).length > 0 });
  } catch (error: any) {
    return Response.json({ error: sanitizeError(error.message || String(error)), success: false }, { status: 500 });
  }
}