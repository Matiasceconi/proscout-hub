import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { organization_id, club_id } = body || {};
    if (!organization_id || !club_id) return Response.json({ error: "organization_id y club_id son obligatorios" }, { status: 400 });

    const asAdmin = base44.asServiceRole;
    const mappings = await asAdmin.entities.ClubProviderMapping.filter({ organization_id, club_id, provider: "api_football" });
    if (mappings.length === 0) return Response.json({ error: "Mapping no encontrado" }, { status: 404 });

    const now = new Date().toISOString();
    await asAdmin.entities.ClubProviderMapping.update(mappings[0].id, { last_sync_at: now });
    return Response.json({ success: true, last_sync_at: now });
  } catch (error: any) {
    return Response.json({ error: error.message?.replace(/key=[^&]+/g, "key=***") }, { status: 500 });
  }
}