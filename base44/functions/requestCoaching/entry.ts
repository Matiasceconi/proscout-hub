import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const REASON_LABELS: Record<string, string> = {
  performance_review: 'Revisión de rendimiento',
  opponent_preparation: 'Preparación del próximo rival',
  career_planning: 'Planificación de carrera',
  confidence_support: 'Confianza y preparación mental',
  other: 'Otro motivo'
};

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const role = user?.app_role || user?.data?.app_role;
    const playerId = user?.player_id || user?.data?.player_id;

    if (!user || role !== 'player' || !playerId) {
      return Response.json({ error: 'Acceso exclusivo para jugadores vinculados.' }, { status: 403 });
    }

    const payload = await req.json();
    const reason = typeof payload?.reason === 'string' ? payload.reason : '';
    const preferredDate = typeof payload?.preferred_date === 'string' ? payload.preferred_date : '';
    const alternativeDate = typeof payload?.alternative_date === 'string' ? payload.alternative_date : '';
    const message = typeof payload?.message === 'string' ? payload.message.trim().slice(0, 1200) : '';

    if (!REASON_LABELS[reason] || !preferredDate) {
      return Response.json({ error: 'Completá el motivo y la fecha preferida.' }, { status: 400 });
    }

    const start = new Date(preferredDate);
    const now = new Date();
    const maxDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    if (Number.isNaN(start.getTime()) || start <= now || start > maxDate) {
      return Response.json({ error: 'La fecha debe estar entre mañana y los próximos 90 días.' }, { status: 400 });
    }

    let alternativeText = 'Sin alternativa';
    if (alternativeDate) {
      const alternative = new Date(alternativeDate);
      if (Number.isNaN(alternative.getTime()) || alternative <= now || alternative > maxDate) {
        return Response.json({ error: 'La fecha alternativa no es válida.' }, { status: 400 });
      }
      alternativeText = alternative.toISOString();
    }

    const player = await base44.asServiceRole.entities.Player.get(playerId);
    if (!player || player.linked_user_id && player.linked_user_id !== user.id) {
      return Response.json({ error: 'No se pudo validar el vínculo con el jugador.' }, { status: 403 });
    }

    const duplicateWindowStart = new Date(start.getTime() - 30 * 60 * 1000).toISOString();
    const duplicateWindowEnd = new Date(start.getTime() + 30 * 60 * 1000).toISOString();
    const existing = await base44.asServiceRole.entities.CalendarEvent.filter({
      organization_id: player.organization_id,
      player_id: player.id,
      event_type: 'meeting',
      source_type: 'follow_up',
      start_date: { $gte: duplicateWindowStart, $lte: duplicateWindowEnd },
      status: { $in: ['scheduled', 'confirmed'] }
    }, '-created_date', 5);

    if (existing.length > 0) {
      return Response.json({ error: 'Ya existe una solicitud para un horario similar.' }, { status: 409 });
    }

    const end = new Date(start.getTime() + 45 * 60 * 1000);
    const playerName = `${player.first_name || ''} ${player.last_name || ''}`.trim();
    const descriptionParts = [
      `Motivo: ${REASON_LABELS[reason]}`,
      `Horario alternativo: ${alternativeText}`,
      message ? `Mensaje del jugador: ${message}` : 'Sin mensaje adicional',
      'Solicitud creada desde el portal del jugador. Pendiente de confirmación por Score Fútbol.'
    ];

    const event = await base44.asServiceRole.entities.CalendarEvent.create({
      organization_id: player.organization_id,
      player_id: player.id,
      player_name: playerName,
      title: `Solicitud de coaching · ${playerName}`,
      description: descriptionParts.join('\n'),
      event_type: 'meeting',
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      location: 'Reunión virtual',
      status: 'scheduled',
      priority: reason === 'opponent_preparation' ? 'high' : 'medium',
      all_day: false,
      source_type: 'follow_up',
      source_id: player.id,
      created_by_user_id: user.id
    });

    await base44.asServiceRole.entities.Notification.create({
      organization_id: player.organization_id,
      user_id: user.id,
      player_id: player.id,
      title: 'Solicitud de coaching enviada',
      message: 'Score Fútbol recibió tu solicitud. Vas a ver la confirmación en tu calendario.',
      type: 'system',
      is_read: false,
      action_url: '/portal/coaching'
    });

    return Response.json({ success: true, event });
  } catch (error) {
    const status = error?.status === 401 ? 401 : 500;
    return Response.json(
      { error: status === 401 ? 'Iniciá sesión para continuar.' : (error?.message || 'No se pudo enviar la solicitud.') },
      { status }
    );
  }
}
