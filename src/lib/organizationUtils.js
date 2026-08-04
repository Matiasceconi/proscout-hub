import { base44 } from '@/api/base44Client';

export async function getMyOrganizationContext() {
  try {
    const me = await base44.auth.me();
    const members = await base44.entities.OrganizationMember.filter({
      $or: [
        { user_id: me.id },
        { user_email: me.email }
      ],
      status: { $in: ['pending', 'active', 'disabled'] }
    });

    if (members.length === 0) {
      return { memberships: [], organizations: [], activeOrg: null };
    }

    const orgIds = [...new Set(members.map(m => m.organization_id))];
    const organizations = [];
    for (const id of orgIds) {
      try {
        const org = await base44.entities.Organization.get(id);
        organizations.push(org);
      } catch (e) {
        // RLS might block; skip
      }
    }

    const userActiveOrgId = me.active_organization_id || me.data?.active_organization_id;
    const storedOrgId = localStorage.getItem('active_organization_id');

    let activeOrg = null;
    if (userActiveOrgId && organizations.find(o => o.id === userActiveOrgId)) {
      activeOrg = organizations.find(o => o.id === userActiveOrgId);
    } else if (storedOrgId && organizations.find(o => o.id === storedOrgId)) {
      activeOrg = organizations.find(o => o.id === storedOrgId);
    } else if (organizations.length === 1) {
      activeOrg = organizations[0];
    }

    return { memberships: members, organizations, activeOrg };
  } catch (err) {
    console.error('Error getting org context:', err);
    return { memberships: [], organizations: [], activeOrg: null };
  }
}

export async function setActiveOrganization(orgId, appRole) {
  await base44.auth.updateMe({
    active_organization_id: orgId,
    organization_id: orgId,
    ...(appRole ? { app_role: appRole, is_player: false } : {})
  });
  localStorage.setItem('active_organization_id', orgId);
}