import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { normalizeEmail, isInvitationUsable } from '../../shared/organizationMembership.ts';

async function getMemberships(base44, user, organizationId) {
  return base44.asServiceRole.entities.OrganizationMember.filter({
    organization_id: organizationId,
    $or: [{ user_id: user.id }, { user_email: normalizeEmail(user.email) }]
  }, '-updated_date', 50);
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { action, token, organizationId } = payload;

    let user = null;
    try {
      user = await base44.auth.me();
    } catch {
      user = null;
    }

    if (action === 'validateInvitation') {
      const invitations = await base44.asServiceRole.entities.OrganizationInvitation.filter({ token }, '-created_date', 1);
      const invitation = invitations[0];
      if (!isInvitationUsable(invitation)) {
        if (invitation?.status === 'pending' && new Date(invitation.expires_at).getTime() <= Date.now()) {
          await base44.asServiceRole.entities.OrganizationInvitation.update(invitation.id, { status: 'expired' });
        }
        return Response.json({ valid: false, error: 'La invitación no es válida, venció o ya fue utilizada.' }, { status: 400 });
      }
      const organization = await base44.asServiceRole.entities.Organization.get(invitation.organization_id);
      return Response.json({ valid: true, organization: { name: organization.name, logo_url: organization.logo_url } });
    }

    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });

    if (action === 'acceptInvitation') {
      const invitations = await base44.asServiceRole.entities.OrganizationInvitation.filter({ token }, '-created_date', 1);
      const invitation = invitations[0];
      if (!isInvitationUsable(invitation)) return Response.json({ error: 'La invitación no es válida, venció o ya fue utilizada.' }, { status: 400 });
      if (normalizeEmail(invitation.email) !== normalizeEmail(user.email)) {
        return Response.json({ error: 'Esta invitación fue emitida para otro correo electrónico.' }, { status: 403 });
      }

      const memberships = await getMemberships(base44, user, invitation.organization_id);
      const member = memberships.find(item => item.user_id === user.id) || memberships.find(item => normalizeEmail(item.user_email) === normalizeEmail(user.email));
      if (!member) return Response.json({ error: 'No se encontró la membresía asociada a esta invitación.' }, { status: 404 });
      if (member.status === 'disabled' || member.status === 'revoked') return Response.json({ error: 'Tu acceso a esta empresa fue suspendido o revocado.' }, { status: 403 });

      const membership = await base44.asServiceRole.entities.OrganizationMember.update(member.id, {
        user_id: user.id,
        user_email: normalizeEmail(user.email),
        full_name: user.full_name || member.full_name || user.email,
        status: 'active',
        membership_key: `${invitation.organization_id}:${user.id}`
      });
      await Promise.all(memberships.filter(item => item.id !== member.id).map(item => base44.asServiceRole.entities.OrganizationMember.delete(item.id)));
      await base44.asServiceRole.entities.OrganizationInvitation.update(invitation.id, {
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by_user_id: user.id,
        membership_id: membership.id
      });
      return Response.json({ membership });
    }

    if (action === 'listOrganizations') {
      const memberships = await base44.asServiceRole.entities.OrganizationMember.filter({
        $or: [{ user_id: user.id }, { user_email: normalizeEmail(user.email) }]
      }, '-updated_date', 100);
      const byOrganization = new Map();
      memberships.forEach(member => {
        const existing = byOrganization.get(member.organization_id);
        if (!existing || member.status === 'active') byOrganization.set(member.organization_id, member);
      });
      const items = await Promise.all([...byOrganization.values()].map(async membership => {
        const organization = await base44.asServiceRole.entities.Organization.get(membership.organization_id);
        return { membership, organization: { id: organization.id, name: organization.name, logo_url: organization.logo_url } };
      }));
      return Response.json({ items });
    }

    if (action === 'selectOrganization') {
      const memberships = await getMemberships(base44, user, organizationId);
      const membership = memberships.find(item => item.status === 'active');
      if (!membership) return Response.json({ error: 'No tenés una membresía activa en esta empresa.' }, { status: 403 });
      const organization = await base44.asServiceRole.entities.Organization.get(organizationId);
      await base44.asServiceRole.entities.User.update(user.id, {
        organization_id: organizationId,
        active_organization_id: organizationId,
        app_role: membership.app_role,
        is_player: false
      });
      return Response.json({ membership, organization: { id: organization.id, name: organization.name, logo_url: organization.logo_url } });
    }

    return Response.json({ error: 'Acción inválida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message || 'No se pudo procesar el acceso a la empresa.' }, { status: 500 });
  }
}