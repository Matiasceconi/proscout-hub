export const API_BASE_URL = "https://v3.football.api-sports.io";

export function getApiKey(): string {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY no configurada");
  return key;
}

export function apiHeaders(): Record<string, string> {
  return { "x-apisports-key": getApiKey() };
}

export function parseRateLimit(headers: Headers): { remaining: number | null; limit: number | null } {
  const remaining = headers.get("x-ratelimit-remaining");
  const limit = headers.get("x-ratelimit-limit");
  return {
    remaining: remaining ? parseInt(remaining) : null,
    limit: limit ? parseInt(limit) : null,
  };
}

export async function apiGet(path: string): Promise<{ data: any; rateLimit: { remaining: number | null; limit: number | null } }> {
  const res = await fetch(`${API_BASE_URL}${path}`, { headers: apiHeaders() });
  const rateLimit = parseRateLimit(res.headers);
  if (res.status === 429) {
    throw { status: 429, message: "Rate limit exceeded", rateLimit };
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw { status: res.status, message: `API error ${res.status}: ${body.slice(0, 200)}`, rateLimit };
  }
  const data = await res.json();
  return { data, rateLimit };
}

export async function apiGetWithRetry(path: string, maxRetries = 2): Promise<{ data: any; rateLimit: { remaining: number | null; limit: number | null } }> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiGet(path);
    } catch (err: any) {
      lastError = err;
      if (err?.status === 429 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt + 1) * 1000;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export function safeNum(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

export function mapMatchStats(playerStat: any, fixture: any, orgId: string, playerId: string, providerPlayerId: string): any {
  const games = playerStat.games || {};
  const shots = playerStat.shots || {};
  const goals = playerStat.goals || {};
  const passes = playerStat.passes || {};
  const tackles = playerStat.tackles || {};
  const duels = playerStat.duels || {};
  const dribbles = playerStat.dribbles || {};
  const fouls = playerStat.fouls || {};
  const cards = playerStat.cards || {};
  const penalty = playerStat.penalty || {};
  const teamId = String(playerStat.team?.id || "");
  const opponentId = String(fixture?.teams?.away?.id === teamId ? fixture?.teams?.home?.id : fixture?.teams?.away?.id || "");
  const isHome = String(fixture?.teams?.home?.id) === teamId;

  return {
    organization_id: orgId,
    player_id: playerId,
    provider: "api_football",
    provider_player_id: providerPlayerId,
    provider_fixture_id: String(fixture?.fixture?.id || ""),
    provider_team_id: teamId,
    provider_league_id: String(fixture?.league?.id || ""),
    season: String(fixture?.league?.season || ""),
    fixture_date: fixture?.fixture?.date ? new Date(fixture.fixture.date).toISOString().slice(0, 10) : null,
    opponent_team_id: opponentId,
    home_away: isHome ? "home" : "away",
    position: games.position || null,
    started: games.status === "starter" || games.status === "Started",
    substitute: games.status === "substitute" || games.status === "Substitute",
    captain: Boolean(playerStat.team?.captain),
    minutes: safeNum(games.minutes) || 0,
    rating: safeNum(games.rating),
    shots_total: safeNum(shots.total),
    shots_on_target: safeNum(shots.on),
    goals: safeNum(goals.total),
    assists: safeNum(goals.assists),
    passes_total: safeNum(passes.total),
    key_passes: safeNum(passes.key),
    pass_accuracy: safeNum(passes.accuracy),
    tackles: safeNum(tackles.total),
    blocks: safeNum(tackles.blocks),
    interceptions: safeNum(tackles.interceptions),
    duels_total: safeNum(duels.total),
    duels_won: safeNum(duels.won),
    dribbles_attempted: safeNum(dribbles.attempts),
    dribbles_successful: safeNum(dribbles.success),
    fouls_drawn: safeNum(fouls.drawn),
    fouls_committed: safeNum(fouls.committed),
    yellow_cards: safeNum(cards.yellow),
    red_cards: safeNum(cards.red),
    penalties_won: safeNum(penalty.won),
    penalties_committed: safeNum(penalty.commited),
    penalties_scored: safeNum(penalty.scored),
    penalties_missed: safeNum(penalty.missed),
    penalties_saved: safeNum(penalty.saved),
    goals_conceded: safeNum(goals.conceded),
    saves: safeNum(goals.saves),
    source_updated_at: new Date().toISOString().slice(0, 10),
    synced_at: new Date().toISOString(),
  };
}

export function mapSeasonStats(leagueStat: any, orgId: string, playerId: string, providerPlayerId: string, season: string): any {
  const games = leagueStat.games || {};
  const shots = leagueStat.shots || {};
  const goals = leagueStat.goals || {};
  const passes = leagueStat.passes || {};
  const tackles = leagueStat.tackles || {};
  const duels = leagueStat.duels || {};
  const dribbles = leagueStat.dribbles || {};
  const fouls = leagueStat.fouls || {};
  const cards = leagueStat.cards || {};
  const penalty = leagueStat.penalty || {};

  return {
    organization_id: orgId,
    player_id: playerId,
    provider: "api_football",
    provider_player_id: providerPlayerId,
    provider_team_id: String(leagueStat.team?.id || ""),
    season: String(leagueStat.league?.season || season),
    league_name: leagueStat.league?.name || null,
    league_id: String(leagueStat.league?.id || ""),
    league_logo: leagueStat.league?.logo || null,
    club_name: leagueStat.team?.name || null,
    club_logo: leagueStat.team?.logo || null,
    appearances: safeNum(games.appearences ?? games.appearances) || 0,
    lineups: safeNum(games.lineups) || 0,
    bench: safeNum(games.bench) || 0,
    minutes: safeNum(games.minutes) || 0,
    rating_avg: safeNum(games.rating),
    goals_total: safeNum(goals.total) || 0,
    goals_assists: safeNum(goals.assists) || 0,
    goals_conceded: safeNum(goals.conceded),
    penalties_scored: safeNum(penalty.scored),
    penalties_missed: safeNum(penalty.missed),
    shots_total: safeNum(shots.total),
    shots_on: safeNum(shots.on),
    passes_total: safeNum(passes.total),
    passes_key: safeNum(passes.key),
    pass_accuracy: safeNum(passes.accuracy),
    yellow_cards: safeNum(cards.yellow) || 0,
    red_cards: safeNum(cards.red) || 0,
    dribbles_attempts: safeNum(dribbles.attempts),
    dribbles_success: safeNum(dribbles.success),
    dribbles_past: safeNum(dribbles.past),
    duels_total: safeNum(duels.total),
    duels_won: safeNum(duels.won),
    fouls_committed: safeNum(fouls.committed),
    fouls_drawn: safeNum(fouls.drawn),
    tackles_total: safeNum(tackles.total),
    tackles_blocks: safeNum(tackles.blocks),
    tackles_interceptions: safeNum(tackles.interceptions),
    defense_saved: safeNum(tackles.saved),
    defense_blocked: safeNum(tackles.blocks),
    defense_clearances: safeNum(tackles.interceptions),
    saves: safeNum(goals.saves),
    source_updated_at: new Date().toISOString().slice(0, 10),
    synced_at: new Date().toISOString(),
  };
}

export function calcSimilarityScore(player: any, candidate: any): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const playerLastName = (player.last_name || "").toLowerCase().trim();
  const playerFirstName = (player.first_name || "").toLowerCase().trim();
  const candName = (candidate.player?.name || "").toLowerCase().trim();
  const candParts = candName.split(/\s+/);
  const candLast = candParts[candParts.length - 1] || "";
  const candFirst = candParts[0] || "";

  if (playerLastName && candLast) {
    if (playerLastName === candLast) { score += 50; reasons.push("Apellido coincide"); }
    else if (playerLastName.includes(candLast) || candLast.includes(playerLastName)) { score += 35; reasons.push("Apellido similar"); }
    else if (playerLastName.slice(0, 3) === candLast.slice(0, 3)) { score += 20; reasons.push("Apellido parecido"); }
  }
  if (playerFirstName && candFirst) {
    if (playerFirstName === candFirst) { score += 20; reasons.push("Nombre coincide"); }
    else if (playerFirstName[0] === candFirst[0]) { score += 10; reasons.push("Inicial coincide"); }
  }
  const posMap: Record<string, string> = { GK: "GK", CB: "DEF", LB: "DEF", RB: "DEF", CDM: "MID", CM: "MID", CAM: "MID", LW: "ATT", RW: "ATT", ST: "ATT", CF: "ATT" };
  const playerPosGroup = posMap[player.position] || "";
  const candPos = (candidate.statistics?.[0]?.games?.position || candidate.games?.position || "").toUpperCase();
  const candPosGroup = posMap[candPos] || (candPos.includes("G") ? "GK" : candPos.includes("D") ? "DEF" : candPos.includes("M") ? "MID" : candPos.includes("F") || candPos.includes("W") || candPos.includes("S") ? "ATT" : "");
  if (playerPosGroup && candPosGroup && playerPosGroup === candPosGroup) { score += 15; reasons.push("Posición compatible"); }

  if (player.nationality && candidate.player?.nationality) {
    if (player.nationality.toLowerCase().includes(candidate.player.nationality.toLowerCase().slice(0, 4))) {
      score += 10; reasons.push("Nacionalidad coincide");
    }
  }
  if (player.birth_date && candidate.player?.age) {
    const playerAge = Math.floor((Date.now() - new Date(player.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (Math.abs(playerAge - candidate.player.age) <= 2) { score += 5; reasons.push("Edad similar"); }
  }
  return { score: Math.min(score, 100), reasons };
}

export function sanitizeError(msg: string): string {
  return msg?.replace(/key=[^&]+/g, "key=***") || "Unknown error";
}