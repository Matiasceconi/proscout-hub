import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { organization_id, club_id, club_name, club_key, provider_team_id, provider_team_name, provider_team_logo, verified_by } = body || {};
    if (!organization_id || !club_id || !provider_team_id) return Response.json({ error: "organization_id, club_id y provider_team_id son obligatorios" }, { status: 400 });

    const asAdmin = base44.asServiceRole;
    const existing = await asAdmin.entities.ClubProviderMapping.filter({ organization_id, club_id, provider: "api_football" });
    const now = new Date().toISOString();

    if (existing.length > 0) {
      const updated = await asAdmin.entities.ClubProviderMapping.update(existing[0].id, {
        provider_team_id: String(provider_team_id), provider_team_name, provider_team_logo,
        mapping_status: "verified", verified_by: verified_by || "admin", verified_at: now,
      });
      return Response.json({ mapping: updated, action: "updated" });
    }

    const mapping = await asAdmin.entities.ClubProviderMapping.create({
      organization_id, club_id, club_name, club_key, provider: "api_football",
      provider_team_id: String(provider_team_id), provider_team_name, provider_team_logo,
      mapping_status: "verified", verified_by: verified_by || "admin", verified_at: now,
    });
    return Response.json({ mapping, action: "created" });
  } catch (error: any) {
    return Response.json({ error: error.message?.replace(/key=[^&]+/g, "key=***") }, { status: 500 });
  }
}