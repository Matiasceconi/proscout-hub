import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Image } from '@/components/ui/image';
import { Building2, CheckCircle2, Loader2, XCircle } from 'lucide-react';

export default function AcceptInvitation() {
  const { isAuthenticated, isLoadingAuth, checkUserAuth } = useAuth();
  const navigate = useNavigate();
  const token = new URLSearchParams(window.location.search).get('token');
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    const validate = async () => {
      if (!token) {
        setError('El enlace de invitación es inválido.');
        setLoading(false);
        return;
      }
      try {
        const response = await base44.functions.invoke('organizationAccess', { action: 'validateInvitation', token });
        setInvitation(response.data.organization);
      } catch (requestError) {
        setError(requestError.response?.data?.error || 'La invitación no es válida.');
      }
      setLoading(false);
    };
    validate();
  }, [token]);

  useEffect(() => {
    const accept = async () => {
      if (!isAuthenticated || !invitation || accepting || error) return;
      setAccepting(true);
      try {
        await base44.functions.invoke('organizationAccess', { action: 'acceptInvitation', token });
        await checkUserAuth();
        navigate('/company-access', { replace: true });
      } catch (requestError) {
        setError(requestError.response?.data?.error || 'No se pudo activar tu acceso.');
        setAccepting(false);
      }
    };
    accept();
  }, [accepting, checkUserAuth, error, invitation, isAuthenticated, navigate, token]);

  if (loading || isLoadingAuth || (isAuthenticated && accepting)) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-slate-500" /></div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4"><div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-8 text-center"><XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" /><h1 className="text-xl font-bold text-slate-900">No pudimos validar la invitación</h1><p className="text-sm text-slate-500 mt-2">{error}</p></div></div>;
  }

  const returnTo = encodeURIComponent(`/invite?token=${encodeURIComponent(token)}`);
  return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4"><div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-8 text-center"><div className="w-14 h-14 rounded-xl bg-slate-900 flex items-center justify-center mx-auto mb-5">{invitation?.logo_url ? <Image src={invitation.logo_url} alt="" className="w-full h-full rounded-xl" /> : <Building2 className="w-7 h-7 text-white" />}</div><CheckCircle2 className="w-7 h-7 text-green-600 mx-auto mb-3" /><h1 className="text-xl font-bold text-slate-900">Te invitaron a {invitation?.name}</h1><p className="text-sm text-slate-500 mt-2">Ingresá con el correo al que recibiste esta invitación para activar tu acceso.</p><div className="grid grid-cols-2 gap-3 mt-6"><Button asChild variant="outline"><Link to={`/login?returnTo=${returnTo}`}>Iniciar sesión</Link></Button><Button asChild><Link to={`/register?returnTo=${returnTo}`}>Crear cuenta</Link></Button></div></div></div>;
}