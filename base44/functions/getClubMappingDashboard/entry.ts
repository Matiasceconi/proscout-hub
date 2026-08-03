import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { organization_id } = body || {};
    if (!organization_id) return Response.json({ error: "organization_id es obligatorio" }, { status: 400 });

    const asAdmin = base44.asServiceRole;
    const [players, directors] = await Promise.all([
      asAdmin.entities.Player.filter({ organization_id }, undefined, 500),
      asAdmin.entities.TechnicalDirector.filter({ organization_id }, undefined, 500)
    ]);
    const [playerCareers, directorCareers] = await Promise.all([
      asAdmin.entities.PlayerCareerEntry.filter({ organization_id, is_current: true }),
      asAdmin.entities.DirectorCareer.filter({ organization_id, is_current: true })
    ]);
    const clubs = await asAdmin.entities.Club.list();
    const clubByKey: Record<string, any> = {};
    const clubById: Record<string, any> = {};
    clubs.forEach((c: any) => { if (c.club_key) clubByKey[c.club_key] = c; clubById[c.id] = c; });
    const mappings = await asAdmin.entities.ClubProviderMapping.filter({ organization_id, provider: "api_football" });
    const mappingByClubId: Record<string, any> = {};
    mappings.forEach((m: any) => { mappingByClubId[m.club_id] = m; });

    const pending: any[] = [];
    const personsByClubId: Record<string, any[]> = {};

    const processPerson = (p: any, personType: string, careers: any[]) => {
      const info = { person_id: p.id, person_type: personType, person_name: `${p.first_name} ${p.last_name}` };
      const current = careers.filter((c: any) => c.current_stage === "ACTUAL");
      if (p.current_club_id && clubById[p.current_club_id]) {
        if (!personsByClubId[p.current_club_id]) personsByClubId[p.current_club_id] = [];
        personsByClubId[p.current_club_id].push(info);
      } else if (current.length === 1) {
        const c = current[0];
        if (c.club_key && clubByKey[c.club_key]) {
          if (!personsByClubId[clubByKey[c.club_key].id]) personsByClubId[clubByKey[c.club_key].id] = [];
          personsByClubId[clubByKey[c.club_key].id].push(info);
        } else {
          pending.push({ ...info, club_name: c.club, club_key: c.club_key });
        }
      } else if (current.length > 1) {
        pending.push({ ...info, club_name: "Multiples etapas actuales", ambiguous: true, options: current.map((c: any) => ({ club_name: c.club, club_key: c.club_key, career_id: c.id })) });
      } else if (p.current_club_id && !clubById[p.current_club_id]) {
        pending.push({ ...info, club_name: "Club inexistente", invalid_club_id: p.current_club_id });
      }
    };
    players.forEach((p: any) => processPerson(p, "player", playerCareers.filter((c: any) => c.player_id === p.id)));
    directors.forEach((d: any) => processPerson(d, "director", directorCareers.filter((c: any) => c.director_id === d.id)));

    const unlinked: any[] = [], linked: any[] = [], ambiguous: any[] = [];
    clubs.forEach((club: any) => {
      const persons = personsByClubId[club.id] || [];
      if (persons.length === 0) return;
      const mapping = mappingByClubId[club.id];
      const ci = { id: club.id, club_name: club.club_name, internal_logo_url: club.internal_logo_url, country: club.country, city: club.city };
      if (!mapping) unlinked.push({ club: ci, persons });
      else if (mapping.mapping_status === "verified") linked.push({ club: ci, mapping, persons_count: persons.length });
      else if (mapping.mapping_status === "ambiguous") ambiguous.push({ club: ci, mapping, persons });
    });

    const errorLogs = await asAdmin.entities.FixtureSyncLog.filter({ organization_id, status: "error" });
    const recentErrors = [...errorLogs].sort((a: any, b: any) => new Date(b.sync_date).getTime() - new Date(a.sync_date).getTime()).slice(0, 10);

    return Response.json({ pending, unlinked, linked, ambiguous, errors: recentErrors });
  } catch (error: any) {
    return Response.json({ error: error.message?.replace(/key=[^&]+/g, "key=***") }, { status: 500 });
  }
}