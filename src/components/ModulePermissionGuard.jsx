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
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    const checkPermission = async () => {
      if (['organization_owner', 'organization_admin'].includes(role)) {
        setAllowed(true);
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
        setAllowed(permissions.includes(permission));
      } catch (error) {
        setAllowed(false);
      }
    };
    if (organizationId && user?.id) checkPermission();
  }, [organizationId, permission, role, user?.id]);

  if (allowed === null) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  }
  if (!allowed) return <Navigate to="/agency" replace />;
  return children;
}