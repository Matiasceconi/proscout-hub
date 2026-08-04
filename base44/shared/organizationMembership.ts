export const MANAGER_ROLES = ['organization_owner', 'organization_admin'];
export const VALID_MEMBER_ROLES = ['organization_admin', 'representative', 'video_analyst', 'performance_staff', 'medical_staff'];

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function isInvitationUsable(invitation) {
  return invitation?.status === 'pending' && new Date(invitation.expires_at).getTime() > Date.now();
}