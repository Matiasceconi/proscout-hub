import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { getHomeRoute, getUserRole } from '@/lib/roleUtils';

export default function RoleGuard({ allowedRoles, children }) {
  const { user, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  const role = getUserRole(user);
  if (!role) return <Navigate to="/company-access" replace />;
  if (!allowedRoles.includes(role)) return <Navigate to={getHomeRoute(user)} replace />;

  return children;
}