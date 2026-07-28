import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { getMyOrganizationContext } from '@/lib/organizationUtils';

export default function Home() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const [redirect, setRedirect] = useState(null);

  useEffect(() => {
    if (isLoadingAuth || !isAuthenticated) return;

    const check = async () => {
      const role = user.app_role || user.data?.app_role;

      if (role === 'platform_superadmin') {
        setRedirect('/superadmin');
        return;
      }

      if (role === 'player') {
        setRedirect('/portal');
        return;
      }

      // For org staff, check if they have an active org
      const ctx = await getMyOrganizationContext();
      if (ctx.activeOrg) {
        setRedirect('/agency');
      } else {
        setRedirect('/company-access');
      }
    };
    check();
  }, [isLoadingAuth, isAuthenticated, user]);

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (redirect) {
    return <Navigate to={redirect} replace />;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
    </div>
  );
}