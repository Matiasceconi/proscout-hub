import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireAgencyMember } from '../../shared/agencyAccess.ts';

const ADMIN_ROLES = ['organization_owner', 'organization_admin'];
const clean = (value: unknown, max = 200) => String(value ?? '').trim().slice(0, max);

async function deleteRows(entity: any, query: any) {
  const rows = await entity.filter(query, '-created_date', 500);
  for (const row of rows) await entity.delete(row.id);
  return rows.length;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ success: false, error: 'Inicia sesión para continuar.' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const organizationId = clean(body.organization_id, 100);
    const playerId = clean(body.player_id, 100);
    const confirmation = clean(body.confirmation, 300);
    if (!organizationId || !playerId) return Response.json({ success: false, error: 'Faltan datos para eliminar el jugador.' }, { status: 400 });

    const member = await requireAgencyMember(base44, user, organizationId);
    if (!member || !ADMIN_ROLES.includes(member.app_role)) {
      return Response.json({ success: false, error: 'Solo un administrador de la agencia puede eliminar jugadores definitivamente.' }, { status: 403 });
    }

    const db = base44.asServiceRole.entities;
    const player = await db.Player.get(playerId).catch(() => null);
    if (!player || player.organization_id !== organizationId) {
      return Response.json({ success: false, error: 'Jugador no encontrado en esta agencia.' }, { status: 404 });
    }

    const fullName = `${player.first_name || ''} ${player.last_name || ''}`.trim();
    if (!fullName || confirmation !== fullName) {
      return Response.json({ success: false, error: `Escribí exactamente “${fullName}” para confirmar la eliminación.` }, { status: 400 });
    }

    const deleted: Record<string, number> = {};

    // Primero conservar la integridad de relaciones que no deben desaparecer completas.
    const fixtures = await db.ClubFixture.filter({ organization_id: organizationId, linked_player_ids: playerId }, '-fixture_date', 500).catch(() => []);
    for (const fixture of fixtures) {
      const nextIds = (fixture.linked_player_ids || []).filter((id: string) => id !== playerId);
      await db.ClubFixture.update(fixture.id, { linked_player_ids: nextIds });
    }
    deleted.ClubFixtureLinks = fixtures.length;

    const scoutingTargets = await db.ScoutingTarget.filter({ organization_id: organizationId, converted_player_id: playerId }, '-updated_date', 500).catch(() => []);
    for (const target of scoutingTargets) {
      await db.ScoutingTarget.update(target.id, { converted_player_id: null });
    }
    deleted.ScoutingTargetLinks = scoutingTargets.length;

    // Eventos: borrar participantes vinculados antes de borrar el evento.
    const calendarEvents = await db.CalendarEvent.filter({ organization_id: organizationId, player_id: playerId }, '-start_date', 500).catch(() => []);
    const eventIds = new Set(calendarEvents.map((e: any) => e.id));
    const directParticipants = await db.CalendarEventParticipant.filter({ organization_id: organizationId, person_type: 'player', person_id: playerId }, '-created_date', 500).catch(() => []);
    const participantsByEvent = eventIds.size
      ? await db.CalendarEventParticipant.filter({ organization_id: organizationId, calendar_event_id: { $in: [...eventIds] } }, '-created_date', 500).catch(() => [])
      : [];
    const participantMap = new Map([...directParticipants, ...participantsByEvent].map((p: any) => [p.id, p]));
    for (const participant of participantMap.values()) await db.CalendarEventParticipant.delete((participant as any).id);
    deleted.CalendarEventParticipant = participantMap.size;
    for (const event of calendarEvents) await db.CalendarEvent.delete(event.id);
    deleted.CalendarEvent = calendarEvents.length;

    // Registros cuyo dueño semántico es el jugador.
    const playerOwnedEntities = [
      'ContentView', 'Document', 'GPSActivity', 'InjuryRecord', 'MarketOpportunity', 'Match',
      'MedicalFollowUp', 'Notification', 'OpponentAnalysis', 'PhysicalAssessment', 'PhysicalProfile',
      'PlayerAssignment', 'PlayerBenefit', 'PlayerCareerEntry', 'PlayerExternalIdentity',
      'PlayerMatchStatistic', 'PlayerMatchStats', 'PlayerSeasonStatistic', 'PlayerSeasonStats',
      'PlayerUserLink', 'VideoContent', 'sportmonks-player-snapshot'
    ];

    for (const entityName of playerOwnedEntities) {
      try {
        deleted[entityName] = await deleteRows(db[entityName], { organization_id: organizationId, player_id: playerId });
      } catch (error) {
        console.error('deleteAgencyPlayer cleanup error', entityName, error);
        return Response.json({ success: false, error: `No se pudo limpiar ${entityName}. No se eliminó la ficha principal.` }, { status: 500 });
      }
    }

    // Desvincular cuentas de portal sin borrar la cuenta de usuario.
    const linkedUsers = await db.User.filter({ player_id: playerId }, '-updated_date', 50).catch(() => []);
    for (const linkedUser of linkedUsers) {
      const patch: any = { player_id: null, player_organization_id: null, is_player: false };
      if (linkedUser.app_role === 'player') patch.app_role = null;
      await db.User.update(linkedUser.id, patch);
    }
    deleted.UserLinks = linkedUsers.length;

    await db.Player.delete(playerId);

    // Registro mínimo de auditoría, sin conservar datos deportivos del jugador.
    try {
      await db.AuditLog.create({
        organization_id: organizationId,
        action: 'player_deleted',
        entity_type: 'Player',
        entity_id: playerId,
        performed_by_user_id: user.id,
        performed_by_email: user.email || '',
        details: `Eliminación definitiva de ${fullName}`,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('deleteAgencyPlayer audit warning', error);
    }

    return Response.json({ success: true, player_id: playerId, deleted });
  } catch (error: any) {
    console.error('deleteAgencyPlayer error', error?.message || error);
    return Response.json({ success: false, error: 'No se pudo eliminar el jugador de forma segura.' }, { status: 500 });
  }
}
