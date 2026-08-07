import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { apiGetWithRetry, mapMatchStats, sanitizeError } from '../../shared/statsUtils.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { fixture_id, organization_id } = body || {};
    if (!fixture_id || !organization_id) return Response.json({ error: "fixture_id y organization_id son obligatorios" }, { status: 400 });

    const asAdmin = base44.asServiceRole;
    const fixtures = await asAdmin.entities.ClubFixture.filter({ organization_id, provider_fixture_id: String(fixture_id) });
    if (fixtures.length === 0) return Response.json({ error: "Fixture no encontrado" }, { status: 404 });
    const fixture = fixtures[0];

    const clubIds = fixture.mapped_club_ids || [];
    if (clubIds.length === 0) return Response.json({ error: "Fixture sin clubes mapeados" }, { status: 400 });

    // Get all players in those clubs with verified identities
    const players = await asAdmin.entities.Player.filter({ organization_id, status: { $ne: "archived" } });
    const relevantPlayers = players.filter(p => p.current_club_id && clubIds.includes(p.current_club_id));
    if (relevantPlayers.length === 0) return Response.json({ success: true, message: "Sin jugadores relevantes", created: 0, updated: 0 });

    const playerIds = relevantPlayers.map(p => p.id);
    const identities = await asAdmin.entities.PlayerExternalIdentity.filter({ organization_id, player_id: { $in: playerIds }, provider: "api_football", status: "verified" });
    if (identities.length === 0) return Response.json({ success: true, message: "Sin jugadores vinculados", created: 0, updated: 0 });

    const identityByPlayer = new Map(identities.map(i => [i.player_id, i]));

    // Single API call for fixture player stats
    const { data, rateLimit } = await apiGetWithRetry(`/fixtures/players?fixture=${fixture_id}`);
    const fixtureData = data.response?.[0];
    if (!fixtureData) return Response.json({ success: true, message: "Sin datos de jugadores", created: 0, updated: 0, rateLimit });

    let created = 0, updated = 0;
    const fullFixture = {
      fixture: { id: fixture.provider_fixture_id, date: fixture.fixture_date },
      league: { id: fixture.competition_id, season: fixture.season },
      teams: {
        home: { id: fixture.home_provider_team_id, name: fixture.home_team_name },
        away: { id: fixture.away_provider_team_id, name: fixture.away_team_name },
      },
    };

    for (const teamData of fixtureData.players || []) {
      for (const playerStat of teamData.players || []) {
        const providerPlayerId = String(playerStat.player?.id || "");
        // Find matching identity by provider_player_id
        let matchedIdentity = null;
        for (const [pid, ident] of identityByPlayer) {
          if (ident.provider_player_id === providerPlayerId) { matchedIdentity = { playerId: pid, ident }; break; }
        }
        if (!matchedIdentity) continue;

        const mapped = mapMatchStats(playerStat, fullFixture, organization_id, matchedIdentity.playerId, providerPlayerId);
        const existing = await asAdmin.entities.PlayerMatchStatistic.filter({
          organization_id, provider: "api_football", provider_fixture_id: String(fixture_id), player_id: matchedIdentity.playerId
        });
        if (existing.length > 0) {
          await asAdmin.entities.PlayerMatchStatistic.update(existing[0].id, mapped);
          updated++;
        } else {
          await asAdmin.entities.PlayerMatchStatistic.create(mapped);
          created++;
        }
      }
    }

    return Response.json({ success: true, created, updated, players_with_stats: created + updated, rateLimit });
  } catch (error: any) {
    return Response.json({ error: sanitizeError(error.message || String(error)), success: false }, { status: 500 });
  }
}