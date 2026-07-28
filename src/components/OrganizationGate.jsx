import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getMyOrganizationContext } from '@/lib/organizationUtils';

export default function OrganizationGate({ children }) {
  const [loading, setLoading] = useState(true);
  const [hasOrg, setHasOrg] = useState(false);

  useEffect(() => {
    const check = async () => {
      const ctx = await getMyOrganizationContext();
      setHasOrg(!!ctx.activeOrg);
      setLoading(false);
    };
    check();
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!hasOrg) {
    return <Navigate to="/company-access" replace />;
  }

  return children;
}