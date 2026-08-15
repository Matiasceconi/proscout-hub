import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { apiGetWithRetry, sanitizeError } from '../../shared/statsUtils.ts';

const PROVIDER = 'api_football';
const APP_TIME_ZONE = 'America/Argentina/Buenos_Aires';
const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'INT', 'LIVE']);
const CACHE_MS = 45_000;

let feedCache: { expiresAt: number; fixtures: any[] } | null = null;
let feedPromise: Promise<any[]> | null = null;
const detailsCache = new Map<string, { expiresAt: number; events: any[]; lineups: any[]; error?: string }>();
const detailsPromises = new Map<string, Promise<any>>();

function localDateISO(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function normalizeEmail(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function mapFixture(raw: any): any {
  const fixture = raw.fixture || {};
  const teams = raw.teams || {};
  const league = raw.league || {};
  const goals = raw.goals || {};
  const status = fixture.status?.short || '';

  return {
    fixture_id: String(fixture.id || ''),
    date: fixture.date || null,
    status,
    status_long: fixture.status?.long || '',
    minute: fixture.status?.elapsed ?? null,
    is_live: LIVE_STATUSES.has(status),
    stadium: fixture.venue?.name || null,
    city: fixture.venue?.city || null,
    league: {
      id: league.id ? String(league.id) : '',
      name: league.name || '',
      logo: league.logo || '',
      season: league.season || null,
      round: league.round || '',
      country: league.country || '',
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

function mapEvent(event: any): any {
  return {
    time: event.time?.elapsed ?? null,
    extra: event.time?.extra ?? null,
    team_id: String(event.team?.id || ''),
    team_name: event.team?.name || '',
    team_logo: event.team?.logo || '',
    type: event.type || '',
    detail: event.detail || '',
    player: event.player?.name || '',
    player_id: event.player?.id ? String(event.player.id) : '',
    assist: event.assist?.name || '',
    assist_id: event.assist?.id ? String(event.assist.id) : '',
  };
}

function mapLineup(team: any): any {
  const mapPlayer = (entry: any) => ({
    player_id: entry.player?.id ? String(entry.player.id) : '',
    name: entry.player?.name || '',
    number: entry.player?.number ?? null,
    pos: entry.player?.pos || '',
    grid: entry.player?.grid || '',
  });

  return {
    team_id: String(team.team?.id || ''),
    team_name: team.team?.name || '',
    team_logo: team.team?.logo || '',
    formation: team.formation || '',
    starters: (team.startXI || []).map(mapPlayer),
    substitutes: (team.substitutes || []).map(mapPlayer),
  };
}

async function getLiveFeed(): Promise<any[]> {
  if (feedCache && feedCache.expiresAt > Date.now()) return feedCache.fixtures;
  if (feedPromise) return feedPromise;

  feedPromise = (async () => {
    const response = await apiGetWithRetry(
      `/fixtures?live=all&timezone=${encodeURIComponent(APP_TIME_ZONE)}`,
    );
    const fixtures = (response.data?.response || [])
      .map(mapFixture)
      .filter((fixture: any) => fixture.fixture_id && fixture.is_live);
    feedCache = { expiresAt: Date.now() + CACHE_MS, fixtures };
    return fixtures;
  })();

  try {
    return await feedPromise;
  } finally {
    feedPromise = null;
  }
}

async function getFixtureDetails(fixtureId: string): Promise<any> {
  const cached = detailsCache.get(fixtureId);
  if (cached && cached.expiresAt > Date.now()) return cached;
  if (detailsPromises.has(fixtureId)) return detailsPromises.get(fixtureId);

  const request = (async () => {
    try {
      const [eventsResponse, lineupsResponse] = await Promise.all([
        apiGetWithRetry(`/fixtures/events?fixture=${fixtureId}`),
        apiGetWithRetry(`/fixtures/lineups?fixture=${fixtureId}`),
      ]);
      const details = {
        expiresAt: Date.now() + CACHE_MS,
        events: (eventsResponse.data?.response || []).map(mapEvent),
        lineups: (lineupsResponse.data?.response || []).map(mapLineup),
      };
      detailsCache.set(fixtureId, details);
      return details;
    } catch (error: any) {
      const details = {
        expiresAt: Date.now() + CACHE_MS,
        events: [],
        lineups: [],
        error: sanitizeError(error?.message || String(error)),
      };
      detailsCache.set(fixtureId, details);
      return details;
    }
  })();

  detailsPromises.set(fixtureId, request);
  try {
    return await request;
  } finally {
    detailsPromises.delete(fixtureId);
  }
}

function participationFor(identity: any, lineup: any): any {
  if (!identity?.provider_player_id) {
    return { status: 'pending_link', starter: null, position: '' };
  }
  if (!lineup) {
    return { status: 'lineup_pending', starter: null, position: '' };
  }

  const providerPlayerId = String(identity.provider_player_id);
  const starter = lineup.starters?.find((entry: any) => entry.player_id === providerPlayerId);
  if (starter) return { status: 'starter', starter: true, position: starter.pos || '' };

  const substitute = lineup.substitutes?.find((entry: any) => entry.player_id === providerPlayerId);
  if (substitute) return { status: 'substitute', starter: false, position: substitute.pos || '' };

  return { status: 'not_listed', starter: null, position: '' };
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const organizationId = String(body?.organization_id || '');
    if (!organizationId) {
      return Response.json({ error: 'organization_id es obligatorio' }, { status: 400 });
    }

    const asAdmin = base44.asServiceRole;
    const email = normalizeEmail(user.email);
    const memberFilters: any[] = [{ user_id: user.id }];
    if (email) memberFilters.push({ user_email: email });

    const memberships = await asAdmin.entities.OrganizationMember.filter({
      organization_id: organizationId,
      status: 'active',
      $or: memberFilters,
    }, '-updated_date', 20);
    const membership = memberships[0];

    if (!membership && user.role !== 'platform_superadmin') {
      return Response.json({ error: 'No tienes acceso activo a esta organización' }, { status: 403 });
    }

    const organization = await asAdmin.entities.Organization.get(organizationId);
    if (!organization || (organization.status && organization.status !== 'active')) {
      return Response.json({ error: 'La organización no está activa' }, { status: 403 });
    }

    const [allPlayers, mappings, identities] = await Promise.all([
      asAdmin.entities.Player.filter({ organization_id: organizationId, status: { $ne: 'archived' } }, '-updated_date', 500),
      asAdmin.entities.ClubProviderMapping.filter({
        organization_id: organizationId,
        provider: PROVIDER,
        mapping_status: 'verified',
      }, '-updated_date', 500),
      asAdmin.entities.PlayerExternalIdentity.filter({
        organization_id: organizationId,
        provider: PROVIDER,
        status: 'verified',
      }, '-updated_date', 500),
    ]);

    const canSeeFullSquad = !membership
      || membership.has_full_squad_access
      || ['organization_owner', 'organization_admin'].includes(membership.app_role);
    const players = canSeeFullSquad
      ? allPlayers
      : allPlayers.filter((player: any) => player.representative_id === membership.id);

    const mappingByClubId = new Map<string, any>();
    for (const mapping of mappings) {
      if (mapping.club_id && mapping.provider_team_id) {
        mappingByClubId.set(String(mapping.club_id), mapping);
      }
    }

    const identityByPlayerId = new Map<string, any>();
    for (const identity of identities) {
      if (identity.player_id) identityByPlayerId.set(String(identity.player_id), identity);
    }

    const playersByTeamId = new Map<string, any[]>();
    for (const player of players) {
      const mapping = player.current_club_id
        ? mappingByClubId.get(String(player.current_club_id))
        : null;
      if (!mapping?.provider_team_id) continue;
      const teamId = String(mapping.provider_team_id);
      if (!playersByTeamId.has(teamId)) playersByTeamId.set(teamId, []);
      playersByTeamId.get(teamId)!.push(player);
    }

    if (playersByTeamId.size === 0) {
      return Response.json({
        success: true,
        date: localDateISO(),
        timezone: APP_TIME_ZONE,
        updated_at: new Date().toISOString(),
        provider: PROVIDER,
        has_live: false,
        total: 0,
        represented_players: 0,
        fixtures: [],
      });
    }

    const liveFeed = await getLiveFeed();
    const relevant = liveFeed.filter((fixture: any) =>
      playersByTeamId.has(fixture.home_team.id)
      || playersByTeamId.has(fixture.away_team.id)
    );

    const fixtures = await Promise.all(relevant.map(async (fixture: any) => {
      const details = await getFixtureDetails(fixture.fixture_id);
      const ourPlayers: any[] = [];

      for (const teamSide of ['home', 'away']) {
        const team = teamSide === 'home' ? fixture.home_team : fixture.away_team;
        const lineup = details.lineups.find((item: any) => String(item.team_id) === team.id);

        for (const player of playersByTeamId.get(team.id) || []) {
          const identity = identityByPlayerId.get(String(player.id));
          const participation = participationFor(identity, lineup);
          ourPlayers.push({
            player_id: player.id,
            name: `${player.first_name || ''} ${player.last_name || ''}`.trim(),
            provider_player_id: identity?.provider_player_id || null,
            provider_linked: Boolean(identity?.provider_player_id),
            team: team.name,
            team_id: team.id,
            team_side: teamSide,
            starter: participation.starter,
            participation_status: participation.status,
            position: participation.position || player.position || '',
            photo_url: player.photo_url || identity?.provider_photo_url || null,
          });
        }
      }

      return {
        ...fixture,
        events: details.events,
        lineups: details.lineups,
        enrichment_status: details.error ? 'partial' : 'complete',
        enrichment_error: details.error || null,
        our_players: ourPlayers,
      };
    }));

    fixtures.sort((left: any, right: any) => Number(right.minute || 0) - Number(left.minute || 0));

    return Response.json({
      success: true,
      date: localDateISO(),
      timezone: APP_TIME_ZONE,
      updated_at: new Date().toISOString(),
      provider: PROVIDER,
      has_live: fixtures.length > 0,
      total: fixtures.length,
      represented_players: fixtures.reduce(
        (total: number, fixture: any) => total + fixture.our_players.length,
        0,
      ),
      fixtures,
    });
  } catch (error: any) {
    return Response.json({
      success: false,
      error: sanitizeError(error?.message || String(error)),
    }, { status: 500 });
  }
}
