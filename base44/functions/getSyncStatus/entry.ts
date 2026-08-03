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
    const mappings = await asAdmin.entities.ClubProviderMapping.filter({ organization_id, provider: "api_football" });
    const syncLogs = await asAdmin.entities.FixtureSyncLog.filter({ organization_id });

    const recentLogs = [...syncLogs].sort((a: any, b: any) => new Date(b.sync_date).getTime() - new Date(a.sync_date).getTime()).slice(0, 20);
    const lastSuccess = [...syncLogs].filter((l: any) => l.status === "success" || l.status === "partial")
      .sort((a: any, b: any) => new Date(b.sync_date).getTime() - new Date(a.sync_date).getTime())[0];

    const mappingSummary = await Promise.all(mappings.map(async (m: any) => {
      const club = await asAdmin.entities.Club.get(m.club_id);
      const clubSyncLogs = syncLogs.filter((l: any) => l.club_id === m.club_id);
      const lastSync = [...clubSyncLogs].sort((a: any, b: any) => new Date(b.sync_date).getTime() - new Date(a.sync_date).getTime())[0];
      return {
        mapping_id: m.id, club_id: m.club_id, club_name: m.club_name || club?.club_name,
        club_logo: club?.internal_logo_url, provider_team_id: m.provider_team_id,
        provider_team_name: m.provider_team_name, mapping_status: m.mapping_status,
        verified_by: m.verified_by, verified_at: m.verified_at, last_sync_at: m.last_sync_at,
        last_sync_status: lastSync?.status, last_sync_date: lastSync?.sync_date,
        last_sync_fixtures: lastSync?.fixtures_imported || 0
      };
    }));

    return Response.json({
      mappings: mappingSummary,
      recent_sync_logs: recentLogs.map((l: any) => ({
        id: l.id, club_id: l.club_id, sync_type: l.sync_type, queries_consumed: l.queries_consumed,
        queries_remaining: l.queries_remaining, status: l.status, errors: l.errors, sync_date: l.sync_date
      })),
      rate_limit: lastSuccess ? { remaining: lastSuccess.queries_remaining, total: lastSuccess.rate_limit } : null,
      total_mappings: mappings.length,
      verified_mappings: mappings.filter((m: any) => m.mapping_status === "verified").length,
      pending_mappings: mappings.filter((m: any) => m.mapping_status === "pending").length,
      ambiguous_mappings: mappings.filter((m: any) => m.mapping_status === "ambiguous").length
    });
  } catch (error: any) {
    return Response.json({ error: error.message?.replace(/key=[^&]+/g, "key=***") }, { status: 500 });
  }
}