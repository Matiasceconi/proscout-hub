import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { apiValue, normalizeName, toNumber } from '../../shared/playerStatsUtils.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { player_id, season = 2026 } = await req.json();
    if (!player_id) return Response.json({ error: 'player_id es obligatorio' }, { status: 400 });
    const apiKey = secrets.get('API_FOOTBALL_KEY');
    if (!apiKey) return Response.json({ error: 'API_FOOTBALL_KEY no configurada' }, { status: 500 });

    const admin = base44.asServiceRole;
    const player = await admin.entities.Player.get(player_id);
    if (!player) return Response.json({ error: 'Jugador no encontrado' }, { status: 404 });
    const memberships = await admin.entities.OrganizationMember.filter({ organization_id: player.organization_id, user_id: user.id, status: 'active' });
    const emailMemberships = memberships.length ? memberships : await admin.entities.OrganizationMember.filter({ organization_id: player.organization_id, user_email: user.email, status: 'active' });
    if (!emailMemberships.length) return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (!player.current_club_id) return Response.json({ error: 'El jugador no tiene club actual vinculado' }, { status: 400 });

    const mappings = await admin.entities.ClubProviderMapping.filter({ organization_id: player.organization_id, club_id: player.current_club_id, provider: 'api_football', mapping_status: 'verified' });
    if (!mappings.length) return Response.json({ error: 'No se encontró un mapeo de club verificado para API-Football' }, { status: 400 });
    const teamId = mappings[0].provider_team_id;
    const apiResponse = await fetch(`https://v3.football.api-sports.io/players?team=${teamId}&season=${season}`, { headers: { 'x-apisports-key': apiKey } });
    if (!apiResponse.ok) return Response.json({ error: `API-Football error: ${apiResponse.status}` }, { status: apiResponse.status });
    const apiData = await apiResponse.json();
    const firstName = normalizeName(player.first_name);
    const lastName = normalizeName(player.last_name);
    const fullName = `${firstName} ${lastName}`.trim();
    const matched = (apiData.response || []).find((item: any) => {
      const apiFirst = normalizeName(item.player?.firstname);
      const apiLast = normalizeName(item.player?.lastname);
      const apiFull = `${apiFirst} ${apiLast}`.trim();
      return apiFull === fullName || apiLast === lastName || (lastName.length > 3 && apiLast.includes(lastName));
    });
    if (!matched) return Response.json({ success: false, message: 'Jugador no encontrado en API-Football', searched_name: fullName, team_id: teamId });

    const playerInfo = matched.player || {};
    const competitions = (matched.statistics || []).map((stat: any) => {
      const games = stat.games || {}, goals = stat.goals || {}, shots = stat.shots || {}, passes = stat.passes || {}, cards = stat.cards || {};
      const dribbles = stat.dribbles || {}, duels = stat.duels || {}, fouls = stat.fouls || {}, tackles = stat.tackles || {}, defense = stat.defense || {}, penalties = goals.penalties || {};
      return {
        league_name: stat.league?.name || '', league_id: String(stat.league?.id || ''), team_name: stat.team?.name || '', team_logo: stat.team?.logo || '',
        appearances: apiValue(games, 'appearences') || apiValue(games, 'appearances'), lineups: apiValue(games, 'lineups'), bench: apiValue(games, 'bench'), minutes: apiValue(games, 'minutes'), rating: games.rating ? toNumber(games.rating) : null, position: stat.games?.position || stat.position || '',
        goals_total: apiValue(goals, 'total'), goals_assists: apiValue(goals, 'assists'), penalties_scored: apiValue(penalties, 'scored'), penalties_missed: apiValue(penalties, 'missed'), shots_total: apiValue(shots, 'total'), shots_on: apiValue(shots, 'on'), passes_total: apiValue(passes, 'total'), passes_key: apiValue(passes, 'key'), passes_accuracy: apiValue(passes, 'accuracy'), yellow_cards: apiValue(cards, 'yellow'), red_cards: apiValue(cards, 'red'), dribbles_attempts: apiValue(dribbles, 'attempts'), dribbles_success: apiValue(dribbles, 'success'), duels_total: apiValue(duels, 'total'), duels_won: apiValue(duels, 'won'), fouls_committed: apiValue(fouls, 'committed'), fouls_drawn: apiValue(fouls, 'drawn'), tackles_total: apiValue(tackles, 'total'), tackles_blocks: apiValue(tackles, 'blocks'), tackles_interceptions: apiValue(tackles, 'interceptions'), defense_saved: apiValue(defense, 'saved'), defense_blocked: apiValue(defense, 'blocked'), defense_clearances: apiValue(defense, 'clearances')
      };
    });

    for (const item of competitions) {
      const existing = await admin.entities.PlayerSeasonStats.filter({ organization_id: player.organization_id, player_id: player.id, season: String(season), provider_team_id: teamId, provider_league_id: item.league_id });
      const record = { organization_id: player.organization_id, player_id: player.id, provider: 'api_football', provider_player_id: String(playerInfo.id), provider_team_id: teamId, provider_league_id: item.league_id, club_id: player.current_club_id, season: String(season), competition: item.league_name, matches: item.appearances, starts: item.lineups, minutes: item.minutes, goals: item.goals_total, assists: item.goals_assists, call_ups: item.appearances + item.bench, yellow_cards: item.yellow_cards, red_cards: item.red_cards, minutes_per_match: item.appearances ? Math.round(item.minutes / item.appearances) : 0, participation_rate: 0, extra_stats: item };
      if (existing.length) await admin.entities.PlayerSeasonStats.update(existing[0].id, record);
      else await admin.entities.PlayerSeasonStats.create(record);
    }

    const updateData: any = { provider_player_id: String(playerInfo.id) };
    if (playerInfo.nationality && !player.nationality) updateData.nationality = playerInfo.nationality;
    if (playerInfo.height && !player.height) updateData.height = toNumber(playerInfo.height);
    if (playerInfo.weight && !player.weight) updateData.weight = toNumber(playerInfo.weight);
    if (playerInfo.photo && (!player.photo_url || player.photo_status === 'pending')) { updateData.photo_url = playerInfo.photo; updateData.photo_status = 'ok'; }
    await admin.entities.Player.update(player.id, updateData);
    return Response.json({ success: true, season_stats: { api_player_id: playerInfo.id, photo: playerInfo.photo, name: playerInfo.name, age: playerInfo.age, nationality: playerInfo.nationality, height: playerInfo.height, weight: playerInfo.weight, competitions }, updated_fields: Object.keys(updateData) });
  } catch (error: any) {
    return Response.json({ error: error.message || 'No se pudieron sincronizar las estadísticas' }, { status: 500 });
  }
}