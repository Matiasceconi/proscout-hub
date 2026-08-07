import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { apiGetWithRetry, calcSimilarityScore, sanitizeError } from '../../shared/statsUtils.ts';

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
    const players = await asAdmin.entities.Player.filter({ id: player_id, organization_id });
    if (!players || players.length === 0) return Response.json({ error: "Jugador no encontrado" }, { status: 404 });
    const player = players[0];

    // Get club's provider team id
    let teamId = null;
    if (player.current_club_id) {
      const mappings = await asAdmin.entities.ClubProviderMapping.filter({ organization_id, club_id: player.current_club_id, provider: "api_football", mapping_status: "verified" });
      if (mappings.length > 0) teamId = mappings[0].provider_team_id;
    }
    if (!teamId && player.provider_player_id) {
      // fallback: use stored provider_player_id's team
      const identities = await asAdmin.entities.PlayerExternalIdentity.filter({ organization_id, player_id, provider: "api_football" });
      if (identities.length > 0) teamId = identities[0].provider_team_id;
    }
    if (!teamId) return Response.json({ error: "El club del jugador no está mapeado a API-Football", suggestions: [] }, { status: 400 });

    const { data, rateLimit } = await apiGetWithRetry(`/players?team=${teamId}&season=${s}`);
    const candidates = (data.response || []).map((c: any) => {
      const { score, reasons } = calcSimilarityScore(player, c);
      return {
        provider_player_id: String(c.player?.id || ""),
        name: c.player?.name || "",
        photo: c.player?.photo || null,
        age: c.player?.age || null,
        nationality: c.player?.nationality || null,
        position: c.statistics?.[0]?.games?.position || null,
        team_name: c.statistics?.[0]?.team?.name || null,
        team_logo: c.statistics?.[0]?.team?.logo || null,
        score, match_reasons: reasons,
      };
    }).sort((a: any, b: any) => b.score - a.score).slice(0, 5);

    return Response.json({ success: true, suggestions: candidates, team_id: teamId, rateLimit });
  } catch (error: any) {
    return Response.json({ error: sanitizeError(error.message || String(error)), success: false, suggestions: [] }, { status: 500 });
  }
}