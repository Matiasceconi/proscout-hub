import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { MANAGER_ROLES, VALID_MEMBER_ROLES, normalizeEmail } from '../../shared/organizationMembership.ts';

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
      return Response.json({ error: 'El acceso debe activarse desde un enlace de invitación válido.' }, { status: 403 });
    }

    const callerMembership = await getCallerMembership(base44, user, organizationId);
    if (!callerMembership) return Response.json({ error: 'No tenés permisos para administrar accesos' }, { status: 403 });

    if (action === 'invite') {
      const { email, appRole, permissions = [], hasFullSquadAccess = false } = payload;
      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail || !VALID_MEMBER_ROLES.includes(appRole)) {
        return Response.json({ error: 'Email o rol inválido' }, { status: 400 });
      }

      const existing = await base44.asServiceRole.entities.OrganizationMember.filter({
        organization_id: organizationId,
        user_email: normalizedEmail
      }, '-updated_date', 10);
      if (existing.some(member => member.status === 'active')) {
        return Response.json({ error: 'Esta persona ya tiene una membresía activa en la empresa.' }, { status: 409 });
      }

      const memberData = {
        user_email: normalizedEmail,
        full_name: normalizedEmail.split('@')[0],
        app_role: appRole,
        permissions,
        has_full_squad_access: hasFullSquadAccess,
        status: 'pending',
        is_owner: false,
        membership_key: `${organizationId}:${normalizedEmail}`
      };
      const membership = existing[0]
        ? await base44.asServiceRole.entities.OrganizationMember.update(existing[0].id, memberData)
        : await base44.asServiceRole.entities.OrganizationMember.create({ organization_id: organizationId, ...memberData });

      const invitations = await base44.asServiceRole.entities.OrganizationInvitation.filter({
        organization_id: organizationId,
        email: normalizedEmail,
        status: 'pending'
      }, '-created_date', 50);
      await Promise.all(invitations.map(invitation => base44.asServiceRole.entities.OrganizationInvitation.update(invitation.id, { status: 'revoked' })));
      const invitation = await base44.asServiceRole.entities.OrganizationInvitation.create({
        organization_id: organizationId,
        membership_id: membership.id,
        email: normalizedEmail,
        token: crypto.randomUUID(),
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });
      return Response.json({ membership, invitation });
    }

    if (action === 'list') {
      const members = await base44.asServiceRole.entities.OrganizationMember.filter({ organization_id: organizationId }, '-created_date', 100);
      return Response.json({ members });
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
      if (appRole && !VALID_MEMBER_ROLES.includes(appRole)) {
        return Response.json({ error: 'Rol inválido' }, { status: 400 });
      }

      const changes = {};
      if (appRole) changes.app_role = appRole;
      if (Array.isArray(permissions)) changes.permissions = permissions;
      if (typeof hasFullSquadAccess === 'boolean') changes.has_full_squad_access = hasFullSquadAccess;
      if (['pending', 'active', 'disabled', 'revoked'].includes(status)) changes.status = status;
      const updated = await base44.asServiceRole.entities.OrganizationMember.update(membershipId, changes);
      return Response.json({ membership: updated });
    }

    return Response.json({ error: 'Acción inválida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message || 'No se pudo administrar el acceso' }, { status: 500 });
  }
}