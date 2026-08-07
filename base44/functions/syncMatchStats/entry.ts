import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { apiValue, normalizeName, toNumber } from '../../shared/playerStatsUtils.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { fixture_id, organization_id } = await req.json();
    if (!fixture_id || !organization_id) return Response.json({ error: 'fixture_id y organization_id son obligatorios' }, { status: 400 });
    const apiKey = secrets.get('API_FOOTBALL_KEY');
    if (!apiKey) return Response.json({ error: 'API_FOOTBALL_KEY no configurada' }, { status: 500 });
    const admin = base44.asServiceRole;
    const memberships = await admin.entities.OrganizationMember.filter({ organization_id, user_id: user.id, status: 'active' });
    const emailMemberships = memberships.length ? memberships : await admin.entities.OrganizationMember.filter({ organization_id, user_email: user.email, status: 'active' });
    if (!emailMemberships.length) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const fixtures = await admin.entities.ClubFixture.filter({ organization_id, provider_fixture_id: String(fixture_id) });
    if (!fixtures.length) return Response.json({ error: `ClubFixture no encontrado: ${fixture_id}` }, { status: 404 });
    const fixture = fixtures[0];
    const players = await admin.entities.Player.filter({ organization_id, current_club_id: { $in: fixture.mapped_club_ids || [] } });
    if (!players.length) return Response.json({ success: true, message: 'No hay jugadores representados en este partido', players_synced: 0 });

    const apiResponse = await fetch(`https://v3.football.api-sports.io/fixtures/players?fixture=${fixture_id}`, { headers: { 'x-apisports-key': apiKey } });
    if (!apiResponse.ok) return Response.json({ error: `API-Football error: ${apiResponse.status}` }, { status: apiResponse.status });
    const apiData = await apiResponse.json();
    const statMap = new Map<string, any>();
    for (const team of apiData.response || []) for (const entry of team.players || []) {
      const first = normalizeName(entry.player?.firstname), last = normalizeName(entry.player?.lastname);
      const stat = entry.statistics?.[0] || {};
      const payload = { id: entry.player?.id, team_name: team.team?.name || '', games: stat.games || {}, goals: stat.goals || {}, shots: stat.shots || {}, passes: stat.passes || {}, cards: stat.cards || {}, dribbles: stat.dribbles || {}, duels: stat.duels || {}, fouls: stat.fouls || {}, tackles: stat.tackles || {}, defense: stat.defense || {} };
      statMap.set(`${first} ${last}`.trim(), payload); if (last.length > 3) statMap.set(last, payload);
    }
    const results = [];
    for (const player of players) {
      const first = normalizeName(player.first_name), last = normalizeName(player.last_name);
      const matched = statMap.get(`${first} ${last}`.trim()) || statMap.get(last) || [...statMap.entries()].find(([name]) => last.length > 3 && name.includes(last))?.[1];
      if (!matched) { results.push({ player_id: player.id, status: 'not_found' }); continue; }
      const games = matched.games, goals = matched.goals, shots = matched.shots, passes = matched.passes, cards = matched.cards, dribbles = matched.dribbles, duels = matched.duels, fouls = matched.fouls, tackles = matched.tackles, defense = matched.defense;
      const position = games.position || '';
      const isStarter = Boolean(games.lineups) || ['G', 'D', 'M', 'F'].includes(position);
      const record = { organization_id, player_id: player.id, club_fixture_id: fixture.id, match_date: String(fixture.fixture_date).slice(0, 10), season: fixture.season || '', competition: fixture.competition_name || '', opponent: matched.team_name === fixture.home_team_name ? fixture.away_team_name : fixture.home_team_name, api_player_id: toNumber(matched.id), match_position: position, minutes_played: apiValue(games, 'minutes'), rating: games.rating ? toNumber(games.rating) : null, is_starter: isStarter, called_up: true, callup_status: isStarter ? 'starter' : 'substitute', goals: apiValue(goals, 'total'), assists: apiValue(goals, 'assists'), penalties_scored: apiValue(goals.penalties, 'scored'), shots_total: apiValue(shots, 'total'), shots_on: apiValue(shots, 'on'), passes_total: apiValue(passes, 'total'), passes_key: apiValue(passes, 'key'), passes_accuracy: apiValue(passes, 'accuracy'), dribbles_attempts: apiValue(dribbles, 'attempts'), dribbles_success: apiValue(dribbles, 'success'), duels_total: apiValue(duels, 'total'), duels_won: apiValue(duels, 'won'), fouls_committed: apiValue(fouls, 'committed'), fouls_drawn: apiValue(fouls, 'drawn'), tackles_total: apiValue(tackles, 'total'), tackles_blocks: apiValue(tackles, 'blocks'), tackles_interceptions: apiValue(tackles, 'interceptions'), yellow_cards: apiValue(cards, 'yellow'), red_cards: apiValue(cards, 'red'), defensive_saved: apiValue(defense, 'saved'), defensive_blocked: apiValue(defense, 'blocked'), defensive_clearances: apiValue(defense, 'clearances'), follow_up_status: 'pending' };
      const existing = await admin.entities.PlayerMatchStats.filter({ player_id: player.id, club_fixture_id: fixture.id });
      if (existing.length) { await admin.entities.PlayerMatchStats.update(existing[0].id, record); results.push({ player_id: player.id, status: 'updated' }); }
      else { await admin.entities.PlayerMatchStats.create(record); results.push({ player_id: player.id, status: 'created' }); }
    }
    return Response.json({ success: true, fixture_id, players_synced: results.filter((item: any) => item.status !== 'not_found').length, results });
  } catch (error: any) {
    return Response.json({ error: error.message || 'No se pudieron sincronizar las estadísticas del partido' }, { status: 500 });
  }
}