import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireAgencyMember, hasAgencyPermission } from '../../shared/agencyAccess.ts';
import { scopedPlayers } from '../../shared/agencyData.ts';

const DAY = 86400000;
const clean = (value: unknown, max = 500) => String(value ?? '').trim().slice(0, max);
const normalize = (value: unknown) => clean(value, 300).toLocaleLowerCase('es-AR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const isAdmin = (member: any) => ['organization_owner', 'organization_admin'].includes(member?.app_role);

async function readRows(entity: any, query: any, sort = '-updated_date', limit = 500) {
  return entity.filter(query, sort, Math.min(Math.max(Number(limit) || 50, 1), 500));
}

function safePlayer(player: any) {
  return {
    id: player.id,
    name: [player.first_name, player.last_name].filter(Boolean).join(' '),
    club: player.club || '',
    position: player.position || null,
    category: player.category || null,
    status: player.sporting_status || player.status || null,
    contract_end: player.contract_end || null,
    birth_date: player.birth_date || null,
    nationality: player.nationality || null,
    representative: player.representative_name || null,
    current_club_id: player.current_club_id || null,
  };
}

function extractText(response: any) {
  if (typeof response?.output_text === 'string' && response.output_text.trim()) return response.output_text.trim();
  const chunks: string[] = [];
  for (const item of response?.output || []) {
    if (item?.type !== 'message') continue;
    for (const part of item?.content || []) {
      if (part?.type === 'output_text' && typeof part.text === 'string') chunks.push(part.text);
    }
  }
  return chunks.join('\n').trim();
}

const tools = [
  {
    type: 'function',
    name: 'search_players',
    description: 'Busca representados autorizados por nombre, club o posición. Úsala antes de pedir una ficha cuando no conozcas el player_id.',
    strict: true,
    parameters: {
      type: 'object', additionalProperties: false,
      properties: {
        query: { type: 'string', description: 'Nombre, apellido, club o posición. Puede estar vacío para listar una muestra.' },
        limit: { type: 'integer', minimum: 1, maximum: 20 }
      },
      required: ['query', 'limit']
    }
  },
  {
    type: 'function',
    name: 'get_player_profile',
    description: 'Obtiene la ficha deportiva básica de un representado autorizado. No incluye datos médicos ni credenciales.',
    strict: true,
    parameters: {
      type: 'object', additionalProperties: false,
      properties: { player_id: { type: 'string' } }, required: ['player_id']
    }
  },
  {
    type: 'function',
    name: 'get_player_matches',
    description: 'Obtiene partidos y estadísticas recientes de un representado autorizado cuando el usuario tiene permiso de partidos/estadísticas.',
    strict: true,
    parameters: {
      type: 'object', additionalProperties: false,
      properties: {
        player_id: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 20 }
      },
      required: ['player_id', 'limit']
    }
  },
  {
    type: 'function',
    name: 'get_agenda',
    description: 'Consulta agenda y seguimientos próximos dentro del alcance autorizado del usuario.',
    strict: true,
    parameters: {
      type: 'object', additionalProperties: false,
      properties: { days: { type: 'integer', minimum: 1, maximum: 60 } }, required: ['days']
    }
  },
  {
    type: 'function',
    name: 'get_upcoming_matches',
    description: 'Consulta próximos partidos que involucran representados de la cartera autorizada.',
    strict: true,
    parameters: {
      type: 'object', additionalProperties: false,
      properties: { days: { type: 'integer', minimum: 1, maximum: 30 } }, required: ['days']
    }
  },
  {
    type: 'function',
    name: 'get_portfolio_summary',
    description: 'Resume la cartera autorizada: cantidad de jugadores, clubes, contratos próximos a vencer y cobertura de datos.',
    strict: true,
    parameters: { type: 'object', additionalProperties: false, properties: {}, required: [] }
  }
];

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ success: false, error: 'Inicia sesión para continuar.' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const orgId = clean(body.organization_id, 100);
    if (!orgId) return Response.json({ success: false, error: 'Selecciona una agencia.' }, { status: 400 });

    const member = await requireAgencyMember(base44, user, orgId);
    if (!member || !hasAgencyPermission(member, 'players')) {
      return Response.json({ success: false, error: 'No tienes acceso a esta cartera.' }, { status: 403 });
    }

    const apiKey = typeof Deno !== 'undefined' ? Deno.env.get('OPENAI_API_KEY') : undefined;
    const model = (typeof Deno !== 'undefined' && Deno.env.get('OPENAI_MODEL')) || 'gpt-5.6-terra';
    if (body.action === 'status') {
      return Response.json({ success: true, configured: Boolean(apiKey), model, mode: 'read_only', provider: 'OpenAI Responses API' });
    }
    if (!apiKey) return Response.json({ success: false, error: 'La integración de OpenAI todavía no está configurada en Score.' }, { status: 503 });

    const question = clean(body.question, 3000);
    if (!question) return Response.json({ success: false, error: 'Escribe una consulta.' }, { status: 400 });

    const db = base44.asServiceRole.entities;
    const players = await scopedPlayers(db, member, user.id, orgId);
    const playerIds = new Set(players.map((p: any) => p.id));
    const canCalendar = hasAgencyPermission(member, 'calendar');
    const canMatches = hasAgencyPermission(member, 'matches');
    const canStats = hasAgencyPermission(member, 'statistics');
    const admin = isAdmin(member);
    const sourcesUsed = new Set<string>();

    async function executeTool(name: string, args: any) {
      if (name === 'search_players') {
        sourcesUsed.add('Player');
        const q = normalize(args.query);
        const found = players.filter((p: any) => {
          if (!q) return true;
          return [p.first_name, p.last_name, `${p.first_name || ''} ${p.last_name || ''}`, p.club, p.position]
            .some(value => normalize(value).includes(q));
        }).slice(0, Math.min(Number(args.limit) || 10, 20));
        return { count: found.length, players: found.map(safePlayer) };
      }

      if (name === 'get_player_profile') {
        sourcesUsed.add('Player');
        const player = players.find((p: any) => p.id === clean(args.player_id, 100));
        if (!player) return { error: 'Jugador fuera del alcance autorizado.' };
        return safePlayer(player);
      }

      if (name === 'get_player_matches') {
        if (!canMatches && !canStats) return { error: 'Sin permiso de partidos o estadísticas.' };
        const playerId = clean(args.player_id, 100);
        if (!playerIds.has(playerId)) return { error: 'Jugador fuera del alcance autorizado.' };
        const limit = Math.min(Number(args.limit) || 10, 20);
        const [operational, imported] = await Promise.all([
          canMatches ? readRows(db.PlayerMatchStats, { organization_id: orgId, player_id: playerId }, '-match_date', limit) : [],
          canStats ? readRows(db.PlayerMatchStatistic, { organization_id: orgId, player_id: playerId }, '-fixture_date', limit) : []
        ]);
        if (operational.length) sourcesUsed.add('PlayerMatchStats');
        if (imported.length) sourcesUsed.add('PlayerMatchStatistic');
        return {
          operational: operational.map((r: any) => ({
            date: r.match_date, competition: r.competition, opponent: r.opponent,
            starter: r.is_starter, callup_status: r.callup_status, minutes: r.minutes_played,
            goals: r.goals, assists: r.assists, yellow_cards: r.yellow_cards, red_cards: r.red_cards,
            rating: r.rating ?? null, next_action: r.next_action || null
          })),
          provider_records: imported.map((r: any) => ({
            date: r.fixture_date, competition: r.competition_name || r.competition,
            opponent: r.opponent_name || r.opponent, minutes: r.minutes ?? null,
            goals: r.goals ?? null, assists: r.assists ?? null, rating: r.rating ?? null,
            provider: r.provider || 'api'
          }))
        };
      }

      if (name === 'get_agenda') {
        if (!canCalendar) return { error: 'Sin permiso de calendario.' };
        sourcesUsed.add('CalendarEvent');
        const days = Math.min(Number(args.days) || 14, 60);
        const now = new Date();
        const end = new Date(now.getTime() + days * DAY);
        const rows = await readRows(db.CalendarEvent, {
          organization_id: orgId,
          status: { $ne: 'cancelled' },
          start_date: { $gte: now.toISOString(), $lte: end.toISOString() }
        }, 'start_date', 300);
        const allowed = rows.filter((e: any) => {
          if (e.event_type === 'medical' && !hasAgencyPermission(member, 'medical')) return false;
          if (e.player_id) return playerIds.has(e.player_id);
          return admin || member.has_full_squad_access || e.responsible_member_id === member.id || e.created_by_user_id === user.id;
        });
        return allowed.slice(0, 100).map((e: any) => ({
          id: e.id, title: e.title, player_id: e.player_id || null, player_name: e.player_name || null,
          start_date: e.start_date, end_date: e.end_date || null, type: e.event_type,
          status: e.status, priority: e.priority, location: e.location || null
        }));
      }

      if (name === 'get_upcoming_matches') {
        if (!canMatches) return { error: 'Sin permiso de partidos.' };
        sourcesUsed.add('ClubFixture');
        const days = Math.min(Number(args.days) || 14, 30);
        const now = new Date();
        const rows = await readRows(db.ClubFixture, {
          organization_id: orgId,
          fixture_date: { $gte: now.toISOString(), $lte: new Date(now.getTime() + days * DAY).toISOString() }
        }, 'fixture_date', 300);
        return rows.map((f: any) => {
          const represented = players.filter((p: any) =>
            f.linked_player_ids?.includes(p.id) || (p.current_club_id && f.mapped_club_ids?.includes(p.current_club_id))
          );
          return {
            id: f.id, date: f.fixture_date, home: f.home_team_name, away: f.away_team_name,
            competition: f.competition_name || null, status: f.fixture_status,
            represented: represented.map((p: any) => ({ id: p.id, name: safePlayer(p).name }))
          };
        }).filter((f: any) => f.represented.length > 0);
      }

      if (name === 'get_portfolio_summary') {
        sourcesUsed.add('Player');
        const now = Date.now();
        const contracts = players.map((p: any) => ({ p, t: p.contract_end ? Date.parse(p.contract_end) : NaN }))
          .filter((x: any) => Number.isFinite(x.t) && x.t >= now && x.t <= now + 180 * DAY)
          .sort((a: any, b: any) => a.t - b.t)
          .map((x: any) => ({ id: x.p.id, name: safePlayer(x.p).name, contract_end: x.p.contract_end, club: x.p.club || '' }));
        const clubCounts = new Map<string, number>();
        for (const p of players) {
          const club = clean(p.club, 120) || 'Sin club';
          clubCounts.set(club, (clubCounts.get(club) || 0) + 1);
        }
        return {
          players: players.length,
          clubs: [...clubCounts.entries()].sort((a, b) => b[1] - a[1]).map(([club, count]) => ({ club, count })),
          contracts_next_180_days: contracts,
          scope: admin || member.has_full_squad_access ? 'Cartera de la agencia' : 'Jugadores asignados al usuario'
        };
      }

      return { error: 'Herramienta no disponible.' };
    }

    const instructions = [
      'Eres el asistente interno de Score Fútbol para representantes.',
      'Responde en español claro, profesional y breve. Usa únicamente los datos obtenidos mediante las herramientas.',
      'No inventes estadísticas, contratos, lesiones, clubes interesados, contactos, decisiones técnicas ni valoraciones.',
      'Si falta información, dilo explícitamente y explica qué dato falta.',
      'No hagas diagnósticos médicos. No expongas datos fuera del alcance autorizado del usuario.',
      'Distingue datos registrados de inferencias. No presentes ausencia de datos como cero.',
      'Esta versión es de solo lectura: nunca afirmes que modificaste, enviaste, programaste o guardaste algo.',
      `Fecha actual de referencia: ${new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'full' }).format(new Date())}.`
    ].join(' ');

    let input: any[] = [{ role: 'user', content: question }];
    let finalResponse: any = null;

    for (let round = 0; round < 4; round++) {
      const apiResponse = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          store: false,
          reasoning: { effort: 'low' },
          instructions,
          input,
          tools,
          parallel_tool_calls: false,
          max_output_tokens: 1800
        })
      });

      const response = await apiResponse.json().catch(() => ({}));
      if (!apiResponse.ok) {
        console.error('OpenAI response error', apiResponse.status, response?.error?.type || 'unknown');
        return Response.json({ success: false, error: 'OpenAI no pudo responder. Revisa la clave, el modelo y los límites del proyecto.' }, { status: 502 });
      }
      finalResponse = response;
      const calls = (response.output || []).filter((item: any) => item?.type === 'function_call');
      if (!calls.length) break;

      input.push(...(response.output || []));
      for (const call of calls) {
        let args: any = {};
        try { args = JSON.parse(call.arguments || '{}'); } catch { args = {}; }
        const result = await executeTool(call.name, args);
        input.push({ type: 'function_call_output', call_id: call.call_id, output: JSON.stringify(result) });
      }
    }

    const answer = extractText(finalResponse);
    if (!answer) return Response.json({ success: false, error: 'La IA no devolvió una respuesta utilizable.' }, { status: 502 });

    return Response.json({
      success: true,
      answer,
      provider: 'OpenAI Responses API',
      model,
      mode: 'read_only',
      sources_used: [...sourcesUsed],
      generated_at: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('score-ai error', error?.message || error);
    return Response.json({ success: false, error: 'No se pudo completar la consulta de IA.' }, { status: 500 });
  }
}
