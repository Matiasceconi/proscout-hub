import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireAgencyMember, hasAgencyPermission } from '../../shared/agencyAccess.ts';

const DAY = 86400000;
const clean = (value: unknown, max = 200) => String(value ?? '').trim().slice(0, max);
async function readAll(entity: any, query: any, sort = '-updated_date') {
  const rows: any[] = [];
  for (let skip = 0; skip < 10000; skip += 500) {
    const page = await entity.filter(query, sort, 500, skip);
    rows.push(...page);
    if (page.length < 500) return rows;
  }
  throw new Error('DATA_LIMIT');
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({error: 'Inicia sesión para continuar.'}, {status: 401});
    const body = await req.json().catch(() => ({}));
    const orgId = clean(body.organization_id, 100);
    if (!orgId) return Response.json({error: 'Selecciona una agencia.'}, {status: 400});
    const member = await requireAgencyMember(base44, user, orgId);
    if (!member || !hasAgencyPermission(member, 'players')) return Response.json({error: 'No tienes acceso activo a esta agencia.'}, {status: 403});
    const db = base44.asServiceRole.entities;
    const admin = ['organization_owner', 'organization_admin'].includes(member.app_role);
    const full = admin || member.has_full_squad_access;
    const [allPlayers, assignments] = await Promise.all([
      readAll(db.Player, {organization_id: orgId, status: {$ne: 'archived'}}),
      full ? [] : readAll(db.PlayerAssignment, {organization_id: orgId, staff_user_id: user.id})
    ]);
    const assigned = new Set(assignments.map((a: any) => a.player_id));
    const players = allPlayers.filter((p: any) => full || assigned.has(p.id) || p.representative_id === member.id || p.representative_id === user.id);
    const playerIds = new Set(players.map((p: any) => p.id));
    const canCalendar = hasAgencyPermission(member, 'calendar');
    const action = body.action || 'overview';

    if (action === 'create_task' || action === 'complete_task') {
      if (!canCalendar) return Response.json({error: 'Necesitas permiso de calendario.'}, {status: 403});
      if (action === 'complete_task') {
        const event = await db.CalendarEvent.get(clean(body.event_id, 100));
        if (!event || event.organization_id !== orgId || !playerIds.has(event.player_id) || event.event_type !== 'follow_up')
          return Response.json({error: 'Seguimiento no disponible.'}, {status: 403});
        await db.CalendarEvent.update(event.id, {status: 'completed'});
        return Response.json({success: true});
      }
      const player = players.find((p: any) => p.id === body.player_id);
      const title = clean(body.title, 160);
      const date = new Date(body.start_date);
      if (!player || !title || !Number.isFinite(date.getTime())) return Response.json({error: 'Revisa jugador, título y fecha.'}, {status: 400});
      const responsibleId = clean(body.responsible_member_id || member.id, 100);
      const responsible = await db.OrganizationMember.get(responsibleId);
      if (!responsible || responsible.organization_id !== orgId || responsible.status !== 'active')
        return Response.json({error: 'El responsable debe ser un miembro activo de Score.'}, {status: 400});
      const duplicate = await db.CalendarEvent.filter({organization_id: orgId, player_id: player.id, title, start_date: date.toISOString(), event_type: 'follow_up', status: {$ne: 'cancelled'}}, '-created_date', 1);
      if (duplicate.length) return Response.json({success: true, event: duplicate[0], existing: true});
      const event = await db.CalendarEvent.create({
        organization_id: orgId, player_id: player.id, player_name: clean(player.first_name + ' ' + player.last_name),
        title, description: clean(body.description, 2000), start_date: date.toISOString(),
        event_type: 'follow_up', source_type: 'follow_up', source_id: player.id, status: 'scheduled',
        priority: ['low', 'medium', 'high'].includes(body.priority) ? body.priority : 'medium',
        responsible_member_id: responsibleId, created_by_user_id: user.id
      });
      return Response.json({success: true, event});
    }
    if (action !== 'overview') return Response.json({error: 'Acción no válida.'}, {status: 400});
    const today = new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
    const start = new Date(Date.now() - 90 * DAY).toISOString();
    const allowedQuery = {organization_id: orgId, player_id: {$in: [...playerIds]}};
    const canStats = hasAgencyPermission(member, 'statistics');
    const [events, identities, stats, members] = await Promise.all([
      canCalendar && players.length ? readAll(db.CalendarEvent, {...allowedQuery, event_type: 'follow_up'}) : [],
      canStats && players.length ? readAll(db.PlayerExternalIdentity, {...allowedQuery, provider: 'api_football'}) : [],
      canStats && players.length ? readAll(db.PlayerMatchStatistic, {...allowedQuery, fixture_date: {$gte: start.slice(0,10)}}, '-fixture_date') : [],
      canCalendar ? readAll(db.OrganizationMember, {organization_id: orgId, status: 'active'}) : []
    ]);
    const memberNames = new Map(members.map((m: any) => [m.id, m.full_name || 'Miembro del equipo']));
    const summaries = players.map((p: any) => {
      const records = stats.filter((s: any) => s.player_id === p.id);
      const unique = [...new Map(records.map((s: any) => [s.provider_fixture_id || s.id, s])).values()] as any[];
      const knownMinutes = unique.filter((s: any) => typeof s.minutes === 'number' && Number.isFinite(s.minutes));
      const followups = events.filter((e: any) => e.player_id === p.id);
      const pending = followups.filter((e: any) => ['scheduled', 'confirmed'].includes(e.status));
      const completed = followups.filter((e: any) => e.status === 'completed').sort((a: any,b: any) => String(b.start_date).localeCompare(String(a.start_date)))[0];
      const alerts: any[] = [];
      const contractDays = p.contract_end && /^\d{4}-\d{2}-\d{2}$/.test(p.contract_end) ? Math.round((Date.parse(p.contract_end) - Date.parse(today)) / DAY) : null;
      if (contractDays !== null && Number.isFinite(contractDays) && contractDays <= 180)
        alerts.push({kind:'contract', priority: contractDays <= 30 ? 'high' : 'medium', text: contractDays < 0 ? 'Vencimiento registrado ya pasado: verificar contrato' : 'Contrato registrado vence en ' + contractDays + ' días'});
      if (canCalendar && pending.some((e: any) => Date.parse(e.start_date) < Date.now()))
        alerts.push({kind:'overdue', priority:'high', text:'Seguimiento pendiente con fecha pasada'});
      if (canCalendar && !pending.length)
        alerts.push({kind:'follow_up', priority:'medium', text:'Sin próxima acción programada'});
      if (!p.representative_id && !p.representative_name)
        alerts.push({kind:'owner', priority:'medium', text:'Sin representante registrado en la ficha'});
      const linked = identities.some((i: any) => i.player_id === p.id && i.status === 'verified');
      if (canStats && !linked) alerts.push({kind:'data', priority:'low', text:'Identidad API-Football sin verificar'});
      const latest = unique[0]?.fixture_date || null;
      if (canStats && (!latest || Date.parse(latest) < Date.now() - 30 * DAY))
        alerts.push({kind:'coverage', priority:'low', text:'Sin estadísticas API recientes; no implica falta de participación'});
      return {
        id:p.id, name:clean(p.first_name + ' ' + p.last_name), club:clean(p.club), position:p.position,
        photo_url:p.photo_url, representative:clean(p.representative_name), contract_end:p.contract_end || null,
        verified_at:p.data_verified_at || null, linked, alerts,
        api_matches_90d:canStats ? unique.length : null, api_minutes_90d:canStats && knownMinutes.length ? knownMinutes.reduce((n:number,s:any)=>n+s.minutes,0) : null,
        api_known_minutes_matches:canStats ? knownMinutes.length : null, last_api_match:latest,
        last_follow_up:completed?.start_date || null,
        next_action:pending.sort((a:any,b:any)=>String(a.start_date).localeCompare(String(b.start_date)))[0]?.title || null
      };
    }).sort((a:any,b:any)=>b.alerts.filter((x:any)=>x.priority==='high').length - a.alerts.filter((x:any)=>x.priority==='high').length || b.alerts.length-a.alerts.length || a.name.localeCompare(b.name));

    return Response.json({
      success:true, generated_at:new Date().toISOString(), players:summaries,
      tasks:events.map((e:any)=>({id:e.id,player_id:e.player_id,player_name:e.player_name,title:e.title,start_date:e.start_date,status:e.status,priority:e.priority,responsible:memberNames.get(e.responsible_member_id)||'Responsable no disponible'})),
      members:members.map((m:any)=>({id:m.id,name:m.full_name||'Miembro del equipo'})),
      permissions:{calendar:canCalendar,statistics:canStats,admin},
      current_member_id:member.id,
      coverage:{players:summaries.length,verified:summaries.filter((p:any)=>p.linked).length,with_api_stats:summaries.filter((p:any)=>p.api_matches_90d>0).length},
      sources:['Player','CalendarEvent','PlayerExternalIdentity','PlayerMatchStatistic'],
      scope:full?'Cartera de la agencia':'Jugadores asignados a tu usuario'
    });
  } catch (error: any) {
    const message = error?.message === 'DATA_LIMIT' ? 'El volumen de datos supera el límite de esta consulta. Acota la cartera antes de continuar.' : 'No se pudo completar la consulta. Reintenta o revisa los permisos y la conexión de datos.';
    return Response.json({success:false,error:message}, {status:500});
  }
}
