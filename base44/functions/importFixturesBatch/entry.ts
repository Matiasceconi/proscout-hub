import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { fixtures, organization_id } = body || {};
    if (!fixtures || !Array.isArray(fixtures) || !organization_id) {
      return Response.json({ error: "fixtures (array) y organization_id son obligatorios" }, { status: 400 });
    }

    const asAdmin = base44.asServiceRole;
    let created = 0, updated = 0;
    const errors: any[] = [];

    for (const f of fixtures) {
      try {
        const existing = await asAdmin.entities.ClubFixture.filter({
          organization_id: f.organization_id,
          provider: f.provider,
          provider_fixture_id: f.provider_fixture_id,
        });

        if (existing.length > 0) {
          const ex = existing[0];
          await asAdmin.entities.ClubFixture.update(ex.id, {
            ...f,
            home_team_logo: ex.home_team_logo || f.home_team_logo,
            away_team_logo: ex.away_team_logo || f.away_team_logo,
            mapped_club_ids: [...new Set([...(ex.mapped_club_ids || []), ...(f.mapped_club_ids || [])])],
          });
          updated++;
        } else {
          await asAdmin.entities.ClubFixture.create(f);
          created++;
        }
      } catch (err: any) {
        errors.push({ id: f.provider_fixture_id, error: err.message });
      }
    }

    return Response.json({ created, updated, total: fixtures.length, errors });
  } catch (error: any) {
    return Response.json({ error: error.message?.replace(/key=[^&]+/g, "key=***") }, { status: 500 });
  }
}