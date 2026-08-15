import React, { useEffect, useState } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import { getMyOrganizationContext, setActiveOrganization } from '@/lib/organizationUtils';
import { SCORE_FUTBOL_BRAND } from '@/lib/scoreFutbolBrand';

export default function CompanyAccess() {
  const [error, setError] = useState('');

  useEffect(() => {
    const enterAuthorizedOrganization = async () => {
      try {
        const ctx = await getMyOrganizationContext();
        const activeItems = ctx.activeItems || [];

        const preferred = activeItems.find(({ organization }) =>
          organization?.slug === 'score-futbol' ||
          (organization?.name === 'Score Fútbol' && Boolean(organization?.logo_url))
        ) || activeItems[0];

        if (!preferred?.organization?.id) {
          setError('No tenés una membresía activa en Score Fútbol.');
          return;
        }

        await setActiveOrganization(preferred.organization.id);
        window.location.replace('/agency');
      } catch {
        setError('No pudimos validar tu acceso. Volvé a iniciar sesión.');
      }
    };

    enterAuthorizedOrganization();
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <ShieldAlert className="mx-auto h-10 w-10 text-amber-500" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">Acceso no disponible</h1>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <a href="/" className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-bold text-white">
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="text-center">
        <img
          src={SCORE_FUTBOL_BRAND.logoUrl}
          alt={`Logo de ${SCORE_FUTBOL_BRAND.name}`}
          className="mx-auto h-24 w-24 object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.35)]"
        />
        <Loader2 className="mx-auto mt-6 h-7 w-7 animate-spin text-emerald-400" />
        <p className="mt-3 text-sm font-medium text-slate-300">Ingresando a Score Fútbol...</p>
      </div>
    </div>
  );
}
