import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { person_type, person_id, organization_id, manual_club_id } = body || {};
    if (!person_type || !person_id || !organization_id) return Response.json({ error: "person_type, person_id y organization_id son obligatorios" }, { status: 400 });

    const asAdmin = base44.asServiceRole;

    if (manual_club_id) {
      const club = await asAdmin.entities.Club.get(manual_club_id);
      if (club) {
        const entityName = person_type === "player" ? "Player" : "TechnicalDirector";
        await asAdmin.entities[entityName].update(person_id, { current_club_id: manual_club_id });
        return Response.json({ status: "verified", club: { id: club.id, club_name: club.club_name, club_key: club.club_key, internal_logo_url: club.internal_logo_url }, source: "manual_selection" });
      }
    }

    let careerRecords: any[] = [];
    if (person_type === "player") {
      careerRecords = await asAdmin.entities.PlayerCareerEntry.filter({ player_id: person_id, organization_id, is_current: true });
    } else {
      careerRecords = await asAdmin.entities.DirectorCareer.filter({ director_id: person_id, organization_id, is_current: true });
    }

    if (careerRecords.length === 0) {
      const entityName = person_type === "player" ? "Player" : "TechnicalDirector";
      const person = await asAdmin.entities[entityName].get(person_id);
      if (person?.current_club_id) {
        const club = await asAdmin.entities.Club.get(person.current_club_id);
        if (club) return Response.json({ status: "verified", club: { id: club.id, club_name: club.club_name, club_key: club.club_key, internal_logo_url: club.internal_logo_url }, source: "direct_field" });
      }
      return Response.json({ status: "sin_club", club: null, message: "Actualmente sin club" });
    }

    const verifiedCurrent = careerRecords.filter((r: any) => r.current_stage === "ACTUAL");
    if (verifiedCurrent.length > 1) {
      const clubs = await Promise.all(verifiedCurrent.map(async (r) => {
        const club = await asAdmin.entities.Club.filter({ club_key: r.club_key });
        return { career_id: r.id, club_id: club[0]?.id, club_name: r.club, club_key: r.club_key, start_date: r.start_date };
      }));
      return Response.json({ status: "ambiguous", message: "Hay más de una etapa actual. Seleccione manualmente.", options: clubs });
    }

    if (verifiedCurrent.length === 1) {
      const career = verifiedCurrent[0];
      const clubs = await asAdmin.entities.Club.filter({ club_key: career.club_key });
      if (clubs.length > 0) {
        const club = clubs[0];
        const entityName = person_type === "player" ? "Player" : "TechnicalDirector";
        await asAdmin.entities[entityName].update(person_id, { current_club_id: club.id });
        return Response.json({ status: "verified", club: { id: club.id, club_name: club.club_name, club_key: club.club_key, internal_logo_url: club.internal_logo_url }, source: "career_history" });
      }
    }

    return Response.json({ status: "sin_club", club: null, message: "Actualmente sin club" });
  } catch (error: any) {
    return Response.json({ error: error.message?.replace(/key=[^&]+/g, "key=***") }, { status: 500 });
  }
}