import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { search, organization_id } = body || {};
    if (!search || !organization_id) return Response.json({ error: "search y organization_id son obligatorios" }, { status: 400 });

    const apiKey = secrets.get("API_FOOTBALL_KEY");
    if (!apiKey) return Response.json({ error: "API_FOOTBALL_KEY no configurada" }, { status: 500 });

    const url = `https://v3.football.api-sports.io/teams?search=${encodeURIComponent(search)}`;
    const response = await fetch(url, { headers: { "x-apisports-key": apiKey } });
    if (!response.ok) return Response.json({ error: `API-Football respondió ${response.status}` }, { status: 502 });

    const data = await response.json();
    const remaining = response.headers.get("x-ratelimit-remaining");
    const limit = response.headers.get("x-ratelimit-limit");
    const teams = (data.response || []).map((t: any) => ({
      provider_team_id: String(t.team.id),
      provider_team_name: t.team.name,
      logo: t.team.logo,
      country: t.team.country, city: t.team.city, founded: t.team.founded,
      venue: t.venue?.name, venue_city: t.venue?.city,
    }));
    const ambiguous = teams.length > 1 && teams.some(t => /juvenile|juvenil|reserve|reserva|sub-|u\d+|b$|ii$/i.test(t.provider_team_name));
    return Response.json({ teams, count: teams.length, ambiguous, rate_limit: { remaining: remaining ? parseInt(remaining) : null, limit: limit ? parseInt(limit) : null } });
  } catch (error: any) {
    return Response.json({ error: "Error al consultar API-Football", detail: error.message?.replace(/key=[^&]+/g, "key=***") }, { status: 500 });
  }
}