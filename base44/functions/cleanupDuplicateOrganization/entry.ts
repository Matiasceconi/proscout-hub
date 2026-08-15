import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const DUPLICATE_ORGANIZATION_ID = '6a69007ff317733e283c45cf';
const CANONICAL_OWNER_ID = '6a637e069a1bc4259bacb8ae';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.id !== CANONICAL_OWNER_ID) {
      return Response.json({ error: 'No autorizado.' }, { status: 403 });
    }

    const asAdmin = base44.asServiceRole;
    const organizations = await asAdmin.entities.Organization.filter({ id: DUPLICATE_ORGANIZATION_ID }, '-created_date', 1);
    const duplicate = organizations[0];

    if (!duplicate) {
      return Response.json({ success: true, already_removed: true });
    }

    if (duplicate.name !== 'ScoreFutbol' || duplicate.logo_url) {
      return Response.json({ error: 'La organización objetivo no coincide con el duplicado sin logo.' }, { status: 409 });
    }

    const protectedEntities = [
      'Player',
      'Club',
      'ClubFixture',
      'Match',
      'Document',
      'TechnicalDirector',
      'CalendarEvent',
      'PlayerMatchStatistic',
      'PlayerSeasonStatistic',
      'OpponentAnalysis'
    ];

    for (const entityName of protectedEntities) {
      const records = await asAdmin.entities[entityName].filter({ organization_id: DUPLICATE_ORGANIZATION_ID }, '-created_date', 1);
      if (records.length > 0) {
        return Response.json({
          error: `El duplicado contiene datos en ${entityName}; la eliminación fue detenida.`
        }, { status: 409 });
      }
    }

    const runs = await asAdmin.entities.StatisticsSyncRun.filter({
      organization_id: DUPLICATE_ORGANIZATION_ID
    }, '-created_date', 100);

    const hasUsefulRun = runs.some((run) =>
      Number(run.players_processed || 0) > 0 ||
      Number(run.fixtures_processed || 0) > 0 ||
      Number(run.records_created || 0) > 0 ||
      Number(run.records_updated || 0) > 0 ||
      Number(run.api_requests_used || 0) > 0
    );

    if (hasUsefulRun) {
      return Response.json({ error: 'El duplicado contiene registros de sincronización útiles.' }, { status: 409 });
    }

    const memberships = await asAdmin.entities.OrganizationMember.filter({
      organization_id: DUPLICATE_ORGANIZATION_ID
    }, '-created_date', 20);

    for (const run of runs) await asAdmin.entities.StatisticsSyncRun.delete(run.id);
    for (const membership of memberships) await asAdmin.entities.OrganizationMember.delete(membership.id);
    await asAdmin.entities.Organization.delete(DUPLICATE_ORGANIZATION_ID);

    return Response.json({
      success: true,
      deleted_organization_id: DUPLICATE_ORGANIZATION_ID,
      deleted_empty_sync_runs: runs.length,
      deleted_memberships: memberships.length
    });
  } catch (error) {
    return Response.json({ error: error?.message || 'No se pudo eliminar la organización duplicada.' }, { status: 500 });
  }
}
