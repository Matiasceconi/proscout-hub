import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Lock, ShieldCheck, AlertCircle, CheckCircle2, Clock, Ban, LogIn } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

export default function ActivatePortal() {
  const navigate = useNavigate();
  const { isAuthenticated, user, checkUserAuth } = useAuth();
  const token = new URLSearchParams(window.location.search).get('token');

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState(null);
  const [status, setStatus] = useState(null);

  const [mode, setMode] = useState('create');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    validateToken();
  }, []);

  const validateToken = async () => {
    if (!token) {
      // No token — check if authenticated with pending invitation (from inviteUser email)
      try {
        const res = await base44.functions.invoke('playerInviteActivation', { action: 'check_pending' });
        if (res.data.pending) {
          setStatus(res.data.expired ? 'expired' : 'pending');
          setInvite({
            player_first_name: res.data.player_first_name,
            player_last_name: res.data.player_last_name,
            organization_name: res.data.organization_name,
            email: res.data.email
          });
        } else {
          setStatus('invalid');
        }
      } catch {
        setStatus('invalid');
      }
      setLoading(false);
      return;
    }
    try {
      const res = await base44.functions.invoke('playerInviteActivation', { action: 'validate', token });
      setStatus(res.data.status);
      if (res.data.status === 'pending') setInvite(res.data);
    } catch {
      setStatus('invalid');
    }
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden.'); return; }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    setSubmitting(true);
    try {
      await base44.auth.register({ email: invite.email, password });
      setShowOtp(true);
    } catch {
      setError('No pudimos crear la cuenta. Es posible que ya tengas una cuenta con este email. Probá con "Ya tengo una cuenta".');
    }
    setSubmitting(false);
  };

  const handleVerifyOtp = async () => {
    setError('');
    setSubmitting(true);
    try {
      const result = await base44.auth.verifyOtp({ email: invite.email, otpCode });
      if (result?.access_token) base44.auth.setToken(result.access_token);
      await activatePortal();
    } catch {
      setError('El código no es válido o ya venció.');
    }
    setSubmitting(false);
  };

  const handleResendOtp = async () => {
    try {
      await base44.auth.resendOtp(invite.email);
    } catch {
      setError('No pudimos reenviar el código.');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await base44.auth.loginViaEmailPassword(invite.email, password);
      await activatePortal();
    } catch {
      setError('No pudimos iniciar sesión. Verificá tu contraseña.');
    }
    setSubmitting(false);
  };

  const handleActivateAuthenticated = async () => {
    setSubmitting(true);
    setError('');
    await activatePortal();
  };

  const activatePortal = async () => {
    try {
      const payload = token ? { action: 'activate', token } : { action: 'activate_by_email' };
      await base44.functions.invoke('playerInviteActivation', payload);
      await checkUserAuth();
      window.location.href = '/portal';
    } catch (err) {
      const msg = err.response?.data?.error || 'No se pudo activar tu portal.';
      setError(msg);
      setSubmitting(false);
    }
  };

  // ---- Loading ----
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  // ---- Error / info states ----
  if (status === 'invalid') {
    return <InfoScreen icon={AlertCircle} iconColor="text-red-500" title="Enlace no válido" message="Este enlace de invitación no es válido." />;
  }
  if (status === 'expired') {
    return <InfoScreen icon={Clock} iconColor="text-amber-500" title="Invitación vencida" message="Esta invitación venció. Pedile a tu agencia que te envíe una nueva." />;
  }
  if (status === 'suspended') {
    return <InfoScreen icon={Ban} iconColor="text-red-500" title="Acceso suspendido" message="Tu acceso al portal está suspendido. Contactá a tu agencia." />;
  }
  if (status === 'active') {
    return (
      <InfoScreen icon={CheckCircle2} iconColor="text-green-600" title="Tu portal ya fue activado" message="Ingresá con tu email y contraseña para acceder a tu espacio.">
        <Button onClick={() => navigate('/login?portal=player')} className="mt-6 bg-slate-900 hover:bg-slate-800">
          Ingresar a mi portal
        </Button>
      </InfoScreen>
    );
  }

  // ---- Pending: main activation flow ----
  const playerName = `${invite?.player_first_name || ''} ${invite?.player_last_name || ''}`.trim();
  const emailMatchesAuth = isAuthenticated && user?.email === invite?.email;

  // OTP verification step (after register)
  if (showOtp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 mb-4">
              <Mail className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Verificá tu correo</h1>
            <p className="text-slate-500 mt-2 text-sm">Enviamos un código a {invite?.email}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
            )}
            <div className="flex justify-center mb-6">
              <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code">
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button onClick={handleVerifyOtp} disabled={submitting || otpCode.length < 6} className="w-full h-12 font-medium">
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verificando...</> : 'Verificar y activar mi portal'}
            </Button>
            <p className="text-center text-sm text-muted-foreground mt-4">
              ¿No recibiste el código?{' '}
              <button onClick={handleResendOtp} className="text-primary font-medium hover:underline">Reenviar</button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Already authenticated with matching email — just confirm
  if (emailMatchesAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4">
        <div className="w-full max-w-md">
          <WelcomeHeader playerName={playerName} orgName={invite?.organization_name} />
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
            )}
            <p className="text-sm text-slate-600 mb-4">
              Detectamos que ya tenés una sesión activa con <strong>{invite?.email}</strong>. Confirmá la activación de tu portal.
            </p>
            <Button onClick={handleActivateAuthenticated} disabled={submitting} className="w-full h-12 font-medium bg-slate-900 hover:bg-slate-800">
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Activando...</> : 'Activar mi portal'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Already authenticated but wrong email
  if (isAuthenticated && user?.email !== invite?.email) {
    return (
      <InfoScreen icon={AlertCircle} iconColor="text-amber-500" title="Esta invitación corresponde a otro email" message={`La invitación es para ${invite?.email}, pero tu sesión actual es ${user?.email}. Cerrá sesión e ingresá con el email correcto.`} />
    );
  }

  // ---- Main form (not authenticated) ----
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 py-8">
      <div className="w-full max-w-md">
        <WelcomeHeader playerName={playerName} orgName={invite?.organization_name} />

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
          )}

          {mode === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="email" type="email" value={invite?.email || ''} readOnly className="pl-10 h-12 bg-slate-50 text-slate-600" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Crear contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="password" type="password" autoComplete="new-password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 h-12" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmar contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="confirm" type="password" autoComplete="new-password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="pl-10 h-12" required />
                </div>
              </div>
              <Button type="submit" disabled={submitting} className="w-full h-12 font-medium bg-slate-900 hover:bg-slate-800">
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creando...</> : 'Crear mi acceso'}
              </Button>
              <p className="text-xs text-center text-slate-400">Este acceso está vinculado exclusivamente a tu perfil como jugador.</p>
              <div className="text-center pt-2 border-t border-slate-100">
                <button type="button" onClick={() => { setMode('login'); setError(''); setPassword(''); }} className="text-sm text-slate-600 hover:text-slate-900 font-medium">
                  Ya tengo una cuenta
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="login-email" type="email" value={invite?.email || ''} readOnly className="pl-10 h-12 bg-slate-50 text-slate-600" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="login-password" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 h-12" required />
                </div>
              </div>
              <Button type="submit" disabled={submitting} className="w-full h-12 font-medium bg-slate-900 hover:bg-slate-800">
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Ingresando...</> : 'Ingresar y activar mi portal'}
              </Button>
              <div className="text-center">
                <button type="button" onClick={() => navigate('/forgot-password')} className="text-xs text-slate-500 hover:text-slate-800">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="text-center pt-2 border-t border-slate-100">
                <button type="button" onClick={() => { setMode('create'); setError(''); setPassword(''); }} className="text-sm text-slate-600 hover:text-slate-900 font-medium">
                  Crear una cuenta nueva
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function WelcomeHeader({ playerName, orgName }) {
  return (
    <div className="text-center mb-6">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 mb-4">
        <ShieldCheck className="w-8 h-8 text-white" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Bienvenido a Score Fútbol</h1>
      {playerName && (
        <p className="text-slate-700 mt-2 font-medium">{playerName}, tu agencia te dio acceso a tu Portal del Jugador.</p>
      )}
      {orgName && (
        <p className="text-sm text-slate-500 mt-1"><strong>{orgName}</strong> te invitó a acceder a tu espacio personal.</p>
      )}
      <div className="mt-4 text-left bg-slate-50 rounded-lg border border-slate-200 p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-700 mb-2">Dentro de tu portal vas a poder consultar:</p>
        <ul className="space-y-1 text-xs text-slate-500">
          <li>• Próximos partidos y calendario</li>
          <li>• Estadísticas y rendimiento</li>
          <li>• Videos y análisis</li>
          <li>• Documentos compartidos por tu agencia</li>
        </ul>
      </div>
    </div>
  );
}

function InfoScreen({ icon: Icon, iconColor, title, message, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
        <Icon className={`w-12 h-12 ${iconColor} mx-auto mb-4`} />
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-500 mt-2">{message}</p>
        {children}
      </div>
    </div>
  );
}