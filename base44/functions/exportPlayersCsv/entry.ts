import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const organization_id = body.organization_id || user.data?.organization_id;
    if (!organization_id) {
      return Response.json({ error: 'organization_id is required' }, { status: 400 });
    }

    const players = await base44.asServiceRole.entities.Player.filter(
      { organization_id, status: { $ne: 'archived' } },
      '-updated_date',
      500
    );

    const clubIds = Array.from(new Set(players.map(p => p.current_club_id).filter(Boolean)));
    const clubs = clubIds.length > 0
      ? await base44.asServiceRole.entities.Club.filter({ id: { $in: clubIds } })
      : [];
    const clubMap = {};
    for (const c of clubs) {
      clubMap[c.id] = {
        name: c.club_name || '',
        logo: c.internal_logo_url || c.official_logo_url || ''
      };
    }

    const headers = [
      'Nombre',
      'Apellido',
      'Tipo',
      'Club Actual',
      'Posicion',
      'Nacionalidad',
      'Photo URL',
      'Current Club ID',
      'Escudo URL'
    ];

    const escapeCsv = (val) => {
      const s = String(val ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    const rows = players.map(p => {
      const club = p.current_club_id ? clubMap[p.current_club_id] : null;
      return [
        escapeCsv(p.first_name),
        escapeCsv(p.last_name),
        'Jugador',
        escapeCsv(club?.name || p.club || ''),
        escapeCsv(p.position || ''),
        escapeCsv(p.nationality || ''),
        escapeCsv(p.photo_url || ''),
        escapeCsv(p.current_club_id || ''),
        escapeCsv(club?.logo || '')
      ].join(',');
    });

    const csv = headers.join(',') + '\n' + rows.join('\n');

    return Response.json({ csv, count: players.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}