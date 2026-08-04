import { base44 } from '@/api/base44Client';

export async function getMyOrganizationContext() {
  const response = await base44.functions.invoke('organizationAccess', { action: 'listOrganizations' });
  const items = response.data.items || [];
  const memberships = items.map(item => item.membership);
  const organizations = items.map(item => item.organization);
  const activeItems = items.filter(item => item.membership.status === 'active');
  const storedOrgId = localStorage.getItem('active_organization_id');
  const activeOrg = activeItems.find(item => item.organization.id === storedOrgId)?.organization || null;
  return { memberships, organizations, activeOrg, activeItems };
}

export async function setActiveOrganization(orgId) {
  const response = await base44.functions.invoke('organizationAccess', { action: 'selectOrganization', organizationId: orgId });
  localStorage.setItem('active_organization_id', orgId);
  return response.data;
}