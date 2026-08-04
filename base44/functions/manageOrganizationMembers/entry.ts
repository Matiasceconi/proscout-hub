import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const MANAGER_ROLES = ['organization_owner', 'organization_admin'];
const VALID_ROLES = ['organization_admin', 'representative', 'video_analyst', 'performance_staff', 'medical_staff'];

async function getCallerMembership(base44, user, organizationId) {
  const memberships = await base44.asServiceRole.entities.OrganizationMember.filter({
    organization_id: organizationId,
    status: 'active',
    $or: [{ user_id: user.id }, { user_email: user.email }]
  }, '-updated_date', 10);
  return memberships.find(member => MANAGER_ROLES.includes(member.app_role)) || null;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });

    const payload = await req.json();
    const { action, organizationId } = payload;
    if (!action || !organizationId) {
      return Response.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    if (action === 'activate') {
      const memberships = await base44.asServiceRole.entities.OrganizationMember.filter({
        organization_id: organizationId,
        user_email: user.email,
        status: { $in: ['pending', 'active'] }
      }, '-created_date', 10);
      const membership = memberships[0];
      if (!membership) return Response.json({ error: 'No existe una invitación activa para esta organización' }, { status: 404 });

      const updated = await base44.asServiceRole.entities.OrganizationMember.update(membership.id, {
        user_id: user.id,
        full_name: membership.full_name || user.full_name || user.email,
        status: 'active',
        membership_key: `${organizationId}:${user.id}`
      });
      return Response.json({ membership: updated });
    }

    const callerMembership = await getCallerMembership(base44, user, organizationId);
    if (!callerMembership) return Response.json({ error: 'No tenés permisos para administrar accesos' }, { status: 403 });

    if (action === 'invite') {
      const { email, appRole, permissions = [], hasFullSquadAccess = false } = payload;
      if (!email || !VALID_ROLES.includes(appRole)) {
        return Response.json({ error: 'Email o rol inválido' }, { status: 400 });
      }

      const existing = await base44.asServiceRole.entities.OrganizationMember.filter({
        organization_id: organizationId,
        user_email: email
      }, '-created_date', 10);

      const memberData = {
        user_email: email.toLowerCase().trim(),
        full_name: email.split('@')[0],
        app_role: appRole,
        permissions,
        has_full_squad_access: hasFullSquadAccess,
        status: 'pending',
        is_owner: false,
        membership_key: `${organizationId}:${email.toLowerCase().trim()}`
      };

      const membership = existing[0]
        ? await base44.asServiceRole.entities.OrganizationMember.update(existing[0].id, memberData)
        : await base44.asServiceRole.entities.OrganizationMember.create({ organization_id: organizationId, ...memberData });

      return Response.json({ membership });
    }

    if (action === 'update') {
      const { membershipId, appRole, permissions, hasFullSquadAccess, status } = payload;
      const membership = await base44.asServiceRole.entities.OrganizationMember.get(membershipId);
      if (!membership || membership.organization_id !== organizationId) {
        return Response.json({ error: 'Miembro no encontrado' }, { status: 404 });
      }
      if (membership.is_owner) {
        return Response.json({ error: 'No se puede modificar al propietario de la agencia' }, { status: 403 });
      }
      if (appRole && !VALID_ROLES.includes(appRole)) {
        return Response.json({ error: 'Rol inválido' }, { status: 400 });
      }

      const changes = {};
      if (appRole) changes.app_role = appRole;
      if (Array.isArray(permissions)) changes.permissions = permissions;
      if (typeof hasFullSquadAccess === 'boolean') changes.has_full_squad_access = hasFullSquadAccess;
      if (['pending', 'active', 'disabled'].includes(status)) changes.status = status;
      const updated = await base44.asServiceRole.entities.OrganizationMember.update(membershipId, changes);
      return Response.json({ membership: updated });
    }

    return Response.json({ error: 'Acción inválida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message || 'No se pudo administrar el acceso' }, { status: 500 });
  }
}