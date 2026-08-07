import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const normalize = (value: string) => (value || '')
  .toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/\b(cf|fc|sc|cd|ac|afc)\b/g, '')
  .replace(/\s+/g, ' ').trim();

const isYouthOrReserve = (value: string) => /\b(ii|iii|u1[0-9]|u2[0-9]|reserva|juvenil|jv|sub[- ]?\d+)\b/i.test(value || '');
const isNoClub = (value: string) => !value || /^(sin club|libre|free agent|unattached)$/i.test(value.trim());

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { organization_id } = await req.json();
    if (!organization_id) return Response.json({ error: 'organization_id es obligatorio' }, { status: 400 });

    const admin = base44.asServiceRole;
    const memberships = await admin.entities.OrganizationMember.filter({ organization_id, user_id: user.id, status: 'active' });
    const emailMemberships = memberships.length ? memberships : await admin.entities.OrganizationMember.filter({ organization_id, user_email: user.email, status: 'active' });
    if (!emailMemberships.length || !['organization_owner', 'organization_admin'].includes(emailMemberships[0].app_role)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const [players, clubs, mappings] = await Promise.all([
      admin.entities.Player.filter({ organization_id }, '-updated_date', 500),
      admin.entities.Club.list('-club_name', 1000),
      admin.entities.ClubProviderMapping.filter({ organization_id, provider: 'api_football', mapping_status: 'verified' })
    ]);
    const verifiedClubIds = new Set(mappings.map((mapping: any) => mapping.club_id));
    const candidates = players.filter((player: any) => !player.current_club_id && !isNoClub(player.club));
    const results: any = { linked: [], not_found: [], ambiguous: [] };

    for (const player of candidates) {
      const playerName = normalize(player.club);
      const exact = clubs.filter((club: any) => normalize(club.club_name) === playerName);
      let pool = exact;
      if (!pool.length) {
        pool = clubs.filter((club: any) => {
          const clubName = normalize(club.club_name);
          return clubName.length > 2 && (clubName.includes(playerName) || playerName.includes(clubName));
        });
      }
      if (!pool.length) {
        results.not_found.push({ player_id: player.id, player_name: `${player.first_name} ${player.last_name}`, club_text: player.club });
        continue;
      }

      const mainTeamPool = pool.filter((club: any) => !isYouthOrReserve(club.club_name));
      if (mainTeamPool.length) pool = mainTeamPool;
      const verifiedPool = pool.filter((club: any) => verifiedClubIds.has(club.id));
      if (verifiedPool.length) pool = verifiedPool;
      const exactAfterPriority = pool.filter((club: any) => normalize(club.club_name) === playerName);
      if (exactAfterPriority.length) pool = exactAfterPriority;

      if (pool.length !== 1) {
        results.ambiguous.push({ player_id: player.id, player_name: `${player.first_name} ${player.last_name}`, club_text: player.club, candidates: pool.map((club: any) => ({ id: club.id, name: club.club_name, has_verified_mapping: verifiedClubIds.has(club.id) })) });
        continue;
      }
      const club = pool[0];
      await admin.entities.Player.update(player.id, { current_club_id: club.id });
      results.linked.push({ player_id: player.id, player_name: `${player.first_name} ${player.last_name}`, club_text: player.club, matched_club: club.club_name, club_id: club.id });
    }

    return Response.json({ success: true, total_processed: candidates.length, linked_count: results.linked.length, not_found_count: results.not_found.length, ambiguous_count: results.ambiguous.length, results });
  } catch (error: any) {
    return Response.json({ error: error.message || 'No se pudo vincular a los jugadores con sus clubes' }, { status: 500 });
  }
}