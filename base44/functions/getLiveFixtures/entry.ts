import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { apiGetWithRetry, sanitizeError } from '../../shared/statsUtils.ts';

const LIVE_STATUSES = ['1H', '2H', 'HT', 'ET', 'BT', 'P'];
const LEAGUE_ID = 128; // Liga Profesional Argentina

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

function mapFixture(raw: any): any {
  const f = raw.fixture || {};
  const teams = raw.teams || {};
  const league = raw.league || {};
  const goals = raw.goals || {};
  const statusShort = f.status?.short || '';
  const isLive = LIVE_STATUSES.includes(statusShort);
  const isFinished = ['FT', 'AET', 'PEN'].includes(statusShort);

  return {
    fixture_id: String(f.id || ''),
    date: f.date || null,
    timestamp: f.timestamp || null,
    status: statusShort,
    status_long: f.status?.long || '',
    elapsed: f.status?.elapsed ?? null,
    minute: f.status?.elapsed ?? null,
    is_live: isLive,
    is_finished: isFinished,
    stadium: f.venue?.name || null,
    city: f.venue?.city || null,
    referee: f.referee || null,
    league: {
      id: league.id,
      name: league.name,
      logo: league.logo,
      season: league.season,
      round: league.round,
    },
    home_team: {
      id: String(teams.home?.id || ''),
      name: teams.home?.name || '',
      logo: teams.home?.logo || '',
    },
    away_team: {
      id: String(teams.away?.id || ''),
      name: teams.away?.name || '',
      logo: teams.away?.logo || '',
    },
    goals: {
      home: goals.home ?? null,
      away: goals.away ?? null,
    },
  };
}

function mapEvent(ev: any): any {
  const teamId = String(ev.team?.id || '');
  return {
    time: ev.time?.elapsed ?? null,
    extra: ev.time?.extra ?? null,
    team_id: teamId,
    team_name: ev.team?.name || '',
    team_logo: ev.team?.logo || '',
    type: ev.type || '',
    detail: ev.detail || '',
    player: ev.player?.name || '',
    player_id: ev.player?.id ? String(ev.player.id) : '',
    assist: ev.assist?.name || '',
    assist_id: ev.assist?.id ? String(ev.assist.id) : '',
  };
}

function mapLineup(team: any): any {
  const starters = (team.startXI || []).map((p: any) => ({
    player_id: p.player?.id ? String(p.player.id) : '',
    name: p.player?.name || '',
    number: p.player?.number ?? null,
    pos: p.player?.pos || '',
    grid: p.player?.grid || '',
  }));
  const subs = (team.substitutes || []).map((p: any) => ({
    player_id: p.player?.id ? String(p.player.id) : '',
    name: p.player?.name || '',
    number: p.player?.number ?? null,
    pos: p.player?.pos || '',
  }));
  return {
    team_id: String(team.team?.id || ''),
    team_name: team.team?.name || '',
    team_logo: team.team?.logo || '',
    team_color: team.team?.colors?.player?.primary || null,
    formation: team.formation || '',
    starters,
    substitutes: subs,
  };
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { organization_id, date, season } = body || {};
    if (!organization_id) return Response.json({ error: 'organization_id es obligatorio' }, { status: 400 });

    const targetDate = date || todayISODate();
    const targetSeason = season || 2026;
    const asAdmin = base44.asServiceRole;

    // Fetch our players + external identities in parallel with fixtures
    const [identities, players] = await Promise.all([
      asAdmin.entities.PlayerExternalIdentity.filter({ organization_id, provider: 'api_football', status: 'verified' }),
      asAdmin.entities.Player.filter({ organization_id, status: { $ne: 'archived' } }),
    ]);

    const playerById = new Map(players.map((p: any) => [p.id, p]));
    // Map provider_player_id -> { player_id, name, provider_team_id }
    const identityByProviderPlayerId = new Map<string, any>();
    for (const id of identities) {
      if (id.provider_player_id) identityByProviderPlayerId.set(String(id.provider_player_id), id);
    }
    // Map provider_team_id -> [identity]
    const identitiesByTeamId = new Map<string, any[]>();
    for (const id of identities) {
      if (id.provider_team_id) {
        const key = String(id.provider_team_id);
        if (!identitiesByTeamId.has(key)) identitiesByTeamId.set(key, []);
        identitiesByTeamId.get(key).push(id);
      }
    }

    // Fetch fixtures
    const fixturesPath = `/fixtures?date=${targetDate}&league=${LEAGUE_ID}&season=${targetSeason}`;
    const fixturesRes = await apiGetWithRetry(fixturesPath);
    const rawFixtures = fixturesRes.data?.response || [];

    const mapped = rawFixtures.map(mapFixture);

    // For live fixtures, fetch events + lineups
    const liveFixtures = mapped.filter((f: any) => f.is_live);
    const enrichmentPromises = liveFixtures.map(async (f: any) => {
      try {
        const [eventsRes, lineupsRes] = await Promise.all([
          apiGetWithRetry(`/fixtures/events?fixture=${f.fixture_id}`),
          apiGetWithRetry(`/fixtures/lineups?fixture=${f.fixture_id}`),
        ]);
        f.events = (eventsRes.data?.response || []).map(mapEvent);
        f.lineups = (lineupsRes.data?.response || []).map(mapLineup);
      } catch (err: any) {
        f.events = [];
        f.lineups = [];
        f._enrich_error = sanitizeError(err?.message || String(err));
      }
    });
    await Promise.all(enrichmentPromises);

    // Identify our players in each fixture
    const enriched = mapped.map((f: any) => {
      const homeIds = identitiesByTeamId.get(f.home_team.id) || [];
      const awayIds = identitiesByTeamId.get(f.away_team.id) || [];
      const ourPlayers: any[] = [];

      const addOurPlayer = (identity: any, teamSide: string, starter: boolean, position: string) => {
        const player = playerById.get(identity.player_id);
        if (!player) return;
        ourPlayers.push({
          player_id: player.id,
          name: `${player.first_name} ${player.last_name}`,
          provider_player_id: identity.provider_player_id,
          team: teamSide === 'home' ? f.home_team.name : f.away_team.name,
          team_side: teamSide,
          starter,
          position,
          photo_url: player.photo_url || null,
        });
      };

      // From identities by team (basic: in squad)
      for (const id of homeIds) {
        const lineup = f.lineups?.find((l: any) => String(l.team_id) === f.home_team.id);
        const starterEntry = lineup?.starters?.find((s: any) => s.player_id === id.provider_player_id);
        const subEntry = lineup?.substitutes?.find((s: any) => s.player_id === id.provider_player_id);
        addOurPlayer(id, 'home', !!starterEntry, starterEntry?.pos || subEntry?.pos || '');
      }
      for (const id of awayIds) {
        const lineup = f.lineups?.find((l: any) => String(l.team_id) === f.away_team.id);
        const starterEntry = lineup?.starters?.find((s: any) => s.player_id === id.provider_player_id);
        const subEntry = lineup?.substitutes?.find((s: any) => s.player_id === id.provider_player_id);
        addOurPlayer(id, 'away', !!starterEntry, starterEntry?.pos || subEntry?.pos || '');
      }

      return { ...f, our_players: ourPlayers };
    });

    const hasLive = enriched.some((f: any) => f.is_live);

    return Response.json({
      success: true,
      date: targetDate,
      season: targetSeason,
      has_live: hasLive,
      total: enriched.length,
      fixtures: enriched,
    });
  } catch (error: any) {
    return Response.json({ error: sanitizeError(error.message || String(error)), success: false }, { status: 500 });
  }
}