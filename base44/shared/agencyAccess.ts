export async function requireAgencyMember(base44: any, user: any, organizationId: string) {
  if (!user || !organizationId) return null;
  const members = await base44.asServiceRole.entities.OrganizationMember.filter({
    organization_id: organizationId, user_id: user.id, status: 'active'
  }, '-updated_date', 1);
  const member = members[0];
  if (!member) return null;
  const org = await base44.asServiceRole.entities.Organization.get(organizationId);
  if (!org || org.status === 'suspended' || org.account_status === 'suspended') return null;
  return member;
}

export function hasAgencyPermission(member: any, permission: string) {
  if (['organization_owner', 'organization_admin'].includes(member.app_role)) return true;
  const defaults: Record<string, string[]> = {
    representative: ['players', 'calendar', 'matches', 'statistics', 'analysis', 'videos', 'documents'],
    video_analyst: ['players', 'matches', 'statistics', 'analysis', 'videos'],
    performance_staff: ['players', 'calendar', 'matches', 'physical'],
    medical_staff: ['players', 'calendar', 'matches', 'medical']
  };
  return (member.permissions?.length ? member.permissions : defaults[member.app_role] || []).includes(permission);
}
