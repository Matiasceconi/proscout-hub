import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { getMyOrganizationContext, setActiveOrganization } from '@/lib/organizationUtils';
import { Button } from '@/components/ui/button';
import { Building2, LogIn, Loader2, ShieldCheck } from 'lucide-react';

const ROLE_LABELS = {
  organization_owner: 'Propietario',
  organization_admin: 'Administrador',
  representative: 'Representante',
  video_analyst: 'Analista de video',
  performance_staff: 'Staff de rendimiento',
  medical_staff: 'Staff médico'
};

export default function CompanyAccess() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [entering, setEntering] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const ctx = await getMyOrganizationContext();
    setMemberships(ctx.memberships);
    setOrgs(ctx.organizations);
    setLoading(false);
  };

  const handleEnter = async (orgId) => {
    setEntering(orgId);
    try {
      const membership = memberships.find(item => item.organization_id === orgId);
      if (membership?.status !== 'active') {
        setEntering(null);
        return;
      }
      await setActiveOrganization(orgId);
      window.location.href = '/agency';
    } catch (err) {
      console.error(err);
      setEntering(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Acceso a la plataforma</h1>
          <p className="text-slate-500 mt-2 text-sm">Seleccioná una empresa para continuar</p>
        </div>

        {orgs.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center mb-4">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-700 font-medium">No se encontraron empresas asociadas</p>
            <p className="text-sm text-slate-400 mt-1">Creá una nueva empresa para comenzar a gestionar tus representados.</p>
          </div>
        ) : (
          <div className="space-y-3 mb-4">
            <p className="text-sm font-medium text-slate-600 px-1">Ingresar a mi empresa</p>
            {orgs.map(org => {
              const membership = memberships.find(m => m.organization_id === org.id);
              return (
                <div key={org.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {org.logo_url ? (
                      <img src={org.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{org.name}</p>
                    <p className="text-sm text-slate-400">
                      {ROLE_LABELS[membership?.app_role] || 'Miembro'} · {membership?.status === 'active' ? 'Activo' : membership?.status === 'disabled' ? 'Acceso suspendido' : membership?.status === 'revoked' ? 'Acceso revocado' : 'Invitación pendiente'}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleEnter(org.id)}
                    disabled={entering === org.id || membership?.status !== 'active'}
                    className="flex-shrink-0"
                  >
                    {entering === org.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
                    {membership?.status === 'active' ? 'Ingresar' : 'Acceso no disponible'}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {orgs.length === 0 && <p className="text-center text-sm text-slate-500">Pedile a un administrador que te agregue a una empresa para poder ingresar.</p>}
      </div>
    </div>
  );
}