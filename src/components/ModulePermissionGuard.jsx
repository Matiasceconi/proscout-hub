import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getUserOrgId, getUserRole } from '@/lib/roleUtils';
import { getDefaultPermissions } from '@/components/agency/settings/accessPermissions';

export default function ModulePermissionGuard({ permission, children }) {
  const { user } = useAuth();
  const organizationId = getUserOrgId(user);
  const role = getUserRole(user);
  const [accessState, setAccessState] = useState({ allowed: null, fallback: '/company-access' });

  useEffect(() => {
    const checkPermission = async () => {
      if (['organization_owner', 'organization_admin'].includes(role)) {
        setAccessState({ allowed: true, fallback: '/agency/operations' });
        return;
      }
      try {
        const members = await base44.entities.OrganizationMember.filter({
          organization_id: organizationId,
          user_id: user?.id,
          status: 'active'
        }, '-updated_date', 1);
        const member = members[0];
        const permissions = member?.permissions?.length ? member.permissions : getDefaultPermissions(member?.app_role || role);
        const fallbackByPermission = [
          ['matches', '/agency/operations'],
          ['players', '/agency/players'],
          ['calendar', '/agency/calendar'],
          ['statistics', '/agency/stats'],
          ['documents', '/agency/documents']
        ];
        const fallback = fallbackByPermission.find(([key]) => permissions.includes(key))?.[1] || '/company-access';
        setAccessState({ allowed: permissions.includes(permission), fallback });
      } catch (error) {
        setAccessState({ allowed: false, fallback: '/company-access' });
      }
    };
    if (organizationId && user?.id) checkPermission();
  }, [organizationId, permission, role, user?.id]);

  if (accessState.allowed === null) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  }
  if (!accessState.allowed) return <Navigate to={accessState.fallback} replace />;
  return children;
}