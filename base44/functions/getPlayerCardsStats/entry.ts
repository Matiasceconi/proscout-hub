import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { organization_id } = body || {};
    if (!organization_id)
      return Response.json({ error: 'organization_id required' }, { status: 400 });

    const asAdmin = base44.asServiceRole;

    // Dynamic current season
    const now = new Date();
    const currentYear = now.getFullYear();
    const seasonYear = String(currentYear);
    const seasonDisplay = `Temporada ${seasonYear}`;

    // 1. Fetch all players for the org
    const players = await asAdmin.entities.Player.filter({ organization_id }, '-updated_date', 500);

    // 2. Fetch clubs referenced by players' current_club_id
    const clubIds = [...new Set(players.map((p: any) => p.current_club_id).filter(Boolean))];
    const clubResults = await Promise.all(
      clubIds.map((id: string) => asAdmin.entities.Club.get(id).catch(() => null))
    );
    const clubMap = new Map();
    for (const c of clubResults) {
      if (c) clubMap.set(c.id, c);
    }

    // 3. Fetch all verified ClubProviderMappings for the org
    const mappings = await asAdmin.entities.ClubProviderMapping.filter({
      organization_id,
      provider: 'api_football'
    }, '-updated_date', 500);
    const mappingByClubId = new Map();
    for (const m of mappings) {
      if (m.mapping_status === 'verified') {
        mappingByClubId.set(m.club_id, m);
      }
    }

    // 4. Fetch all PlayerSeasonStats for the org (filter season in memory)
    const allStats = await asAdmin.entities.PlayerSeasonStats.filter({ organization_id }, '-updated_date', 2000);

    const matchesSeason = (seasonStr: string) => {
      if (!seasonStr) return false;
      return seasonStr === seasonYear ||
        seasonStr.endsWith(`/${seasonYear}`) ||
        seasonStr.startsWith(`${seasonYear}/`);
    };

    // 5. Build per-player result
    const result: Record<string, any> = {};
    for (const player of players) {
      const entry: any = {
        player_id: player.id,
        club: null,
        stats: null,
        status: 'sin_club'
      };

      // Step 1: current_club_id
      if (!player.current_club_id) {
        result[player.id] = entry;
        continue;
      }

      const club = clubMap.get(player.current_club_id);
      if (!club) {
        result[player.id] = entry;
        continue;
      }

      entry.club = {
        id: club.id,
        club_name: club.club_name,
        short_name: club.short_name,
        internal_logo_url: club.internal_logo_url,
        official_logo_url: club.official_logo_url,
        country: club.country,
        city: club.city
      };

      // Step 2: ClubProviderMapping (verified)
      const mapping = mappingByClubId.get(club.id);
      if (!mapping) {
        entry.status = 'club_sin_vincular';
        result[player.id] = entry;
        continue;
      }
      entry.provider_team_id = mapping.provider_team_id;
      entry.provider_team_logo = mapping.provider_team_logo;

      // Step 3: provider_player_id on the player
      const providerPlayerId = player.provider_player_id ||
        (player.external_source === 'api_football' ? player.external_id : null);
      if (!providerPlayerId) {
        entry.status = 'jugador_sin_vincular';
        result[player.id] = entry;
        continue;
      }

      // Step 4: Filter stats — current season + current club's provider_team_id only
      const playerStats = allStats.filter((s: any) =>
        s.player_id === player.id &&
        matchesSeason(s.season) &&
        s.provider_team_id === mapping.provider_team_id
      );

      if (playerStats.length === 0) {
        entry.status = 'sin_datos';
        result[player.id] = entry;
        continue;
      }

      // Step 5: Coverage check
      const statsWithCoverage = playerStats.filter((s: any) => s.has_coverage !== false);
      if (statsWithCoverage.length === 0) {
        entry.status = 'sin_cobertura';
        result[player.id] = entry;
        continue;
      }

      // Step 6: Aggregate with dedup by org+provider+player+season+team+league
      const seenKeys = new Set();
      let pj = 0, min = 0, goals = 0, assists = 0;
      for (const s of statsWithCoverage) {
        const dedupKey = `${s.provider || 'api_football'}_${s.provider_player_id || ''}_${s.season}_${s.provider_team_id || ''}_${s.provider_league_id || ''}`;
        if (seenKeys.has(dedupKey)) continue;
        seenKeys.add(dedupKey);
        pj += (s.matches || 0);
        min += (s.minutes || 0);
        goals += (s.goals || 0);
        assists += (s.assists || 0);
      }

      entry.stats = { pj, min, ga: goals + assists };
      entry.status = 'ok';
      result[player.id] = entry;
    }

    return Response.json({
      players: result,
      season: seasonYear,
      season_display: seasonDisplay
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}