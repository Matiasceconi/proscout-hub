import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function createMissingClubs(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const organizationId = body.organization_id || user.data?.organization_id || null;
    if (!organizationId) {
      return Response.json({ error: 'organization_id is required' }, { status: 400 });
    }

    const clubsToCreate = [
      { club_name: "Club León", country: "Mexico", team_id: "2289" },
      { club_name: "Universitario de Deportes", country: "Peru", team_id: "2540" },
      { club_name: "Ascoli", country: "Italia", team_id: "507" },
      { club_name: "Independiente Medellín", country: "Colombia", team_id: "1128" },
      { club_name: "Holstein Kiel", country: "Alemania", team_id: "191" },
      { club_name: "Instituto Córdoba", country: "Argentina", team_id: "478" },
      { club_name: "Sporting de Gijón", country: "España", team_id: "731" },
      { club_name: "Juventud de Las Piedras", country: "Uruguay", team_id: "2353" },
      { club_name: "Villarreal CF", country: "España", team_id: "533" },
      { club_name: "Chacarita Juniors", country: "Argentina", team_id: "447" },
      { club_name: "Aldosivi", country: "Argentina", team_id: "463" },
      { club_name: "San Martín de Tucumán", country: "Argentina", team_id: "485" },
      { club_name: "Plaza Colonia", country: "Uruguay", team_id: "2355" },
      { club_name: "Parma", country: "Italia", team_id: "523" },
      { club_name: "Emelec", country: "Ecuador", team_id: "1148" },
      { club_name: "Atlético Paranaense", country: "Brasil", team_id: "134" },
    ];

    const results = [];

    for (const club of clubsToCreate) {
      try {
        const existingMappings = await base44.asServiceRole.entities.ClubProviderMapping.filter({
          provider_team_id: club.team_id
        });

        if (existingMappings && existingMappings.length > 0) {
          results.push({ club: club.club_name, status: "already_exists", club_id: existingMappings[0].club_id });
          continue;
        }

        const clubRecord = await base44.asServiceRole.entities.Club.create({
          club_name: club.club_name,
          country: club.country,
          club_key: `api-team-${club.team_id}`,
          verification_status: "PENDING"
        });

        const mappingData = {
          club_id: clubRecord.id,
          provider: "api_football",
          provider_team_id: club.team_id,
          provider_team_name: club.club_name
        };
        if (organizationId) mappingData.organization_id = organizationId;

        const mapping = await base44.asServiceRole.entities.ClubProviderMapping.create(mappingData);

        results.push({
          club: club.club_name,
          status: "created",
          club_id: clubRecord.id,
          mapping_id: mapping.id
        });
      } catch (err) {
        results.push({ club: club.club_name, status: "error", error: err.message || String(err) });
      }
    }

    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}