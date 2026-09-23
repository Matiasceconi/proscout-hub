import React, { useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, Loader2, Users, UserRound, ArrowRight, ShieldCheck, BarChart3, CalendarDays } from 'lucide-react';
import { safeReturnTo } from '@/lib/authReturnTo';
import { getHomeRoute } from '@/lib/roleUtils';
import { SCORE_FUTBOL_BRAND } from '@/lib/scoreFutbolBrand';

const accessModes = {
  staff: {
    icon: Users,
    eyebrow: 'Staff',
    title: 'Acceso Staff',
    description: 'Gestión de jugadores, partidos, estadísticas, agenda y seguimiento.',
  },
  player: {
    icon: UserRound,
    eyebrow: 'Jugador',
    title: 'Acceso Jugador',
    description: 'Tu espacio personal de rendimiento, partidos, agenda e informes.',
  },
};

export default function Login() {
  const { user, isAuthenticated, authChecked } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const returnTo = safeReturnTo();
  const queryPortal = searchParams.get('portal');
  const mode = queryPortal === 'player' ? 'player' : 'staff';
  const isPlayer = mode === 'player';
  const current = accessModes[mode];

  const returnToQuery = useMemo(() => encodeURIComponent(returnTo || '/'), [returnTo]);

  if (authChecked && isAuthenticated) {
    const destination = returnTo && !['/', '/login'].includes(returnTo) ? returnTo : getHomeRoute(user);
    return <Navigate to={destination} replace />;
  }

  const selectMode = (nextMode) => {
    const next = new URLSearchParams(searchParams);
    next.set('portal', nextMode);
    if (!next.get('returnTo')) next.set('returnTo', returnTo || '/');
    setSearchParams(next, { replace: true });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = returnTo;
    } catch {
      setError('No pudimos iniciar sesión. Verificá el correo y la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07101e] lg:grid lg:grid-cols-[0.92fr_1.08fr]">
      <aside className="relative hidden min-h-screen overflow-hidden border-r border-white/[0.08] px-10 py-10 text-white lg:flex lg:flex-col xl:px-14 xl:py-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(7,176,81,0.20),transparent_28%),linear-gradient(145deg,#07101e_0%,#0c192b_100%)]" />
        <div className="absolute -right-40 top-16 h-[440px] w-[440px] rounded-full border border-emerald-300/10" aria-hidden="true" />
        <div className="absolute -bottom-48 -left-36 h-[520px] w-[520px] rounded-full border border-white/[0.06]" aria-hidden="true" />

        <Link to="/" className="relative flex items-center gap-3">
          <img src={SCORE_FUTBOL_BRAND.logoUrl} alt={`Logo de ${SCORE_FUTBOL_BRAND.name}`} className="h-16 w-16 object-contain" />
          <div>
            <p className="text-xl font-black tracking-tight">{SCORE_FUTBOL_BRAND.name}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">Representación · Rendimiento · Seguimiento</p>
          </div>
        </Link>

        <div className="relative my-auto max-w-xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Una sola plataforma</p>
          <h1 className="mt-5 text-4xl font-black leading-[1.06] tracking-[-0.04em] xl:text-5xl">
            Información conectada para acompañar cada carrera.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
            Score Fútbol reúne jugadores, clubes, partidos, estadísticas y seguimiento en un entorno privado para staff y representados.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <MiniPillar icon={Users} title="Cartera" text="Jugadores y clubes" />
            <MiniPillar icon={BarChart3} title="Rendimiento" text="Partidos y datos" />
            <MiniPillar icon={CalendarDays} title="Seguimiento" text="Agenda y acciones" />
          </div>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          Acceso privado para usuarios autorizados
        </div>
      </aside>

      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-8 lg:px-12 xl:px-16">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-2xl flex-col justify-center">
          <div className="mb-7 flex items-center justify-center gap-3 lg:hidden">
            <img src={SCORE_FUTBOL_BRAND.logoUrl} alt="" className="h-14 w-14 object-contain" />
            <div>
              <p className="font-black text-slate-950">{SCORE_FUTBOL_BRAND.name}</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-700">Representación · Rendimiento · Seguimiento</p>
            </div>
          </div>

          <div className="mb-6 text-center lg:text-left">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Ingresar a Score Fútbol</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.03em] text-slate-950 sm:text-4xl">Elegí tu acceso</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Staff y jugadores ingresan desde el mismo lugar, con herramientas diferentes para cada rol.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2" aria-label="Tipo de acceso">
            {Object.entries(accessModes).map(([id, item]) => {
              const Icon = item.icon;
              const active = mode === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectMode(id)}
                  className={`group rounded-2xl border p-4 text-left transition ${active ? 'border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-950/10' : 'border-slate-200 bg-white text-slate-900 hover:border-emerald-300 hover:bg-emerald-50/40'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${active ? 'bg-emerald-400 text-slate-950' : 'bg-slate-100 text-slate-600'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${active ? 'bg-white/10 text-emerald-300' : 'bg-slate-100 text-slate-500'}`}>{item.eyebrow}</span>
                  </div>
                  <p className="mt-4 text-lg font-black">{item.title}</p>
                  <p className={`mt-1 text-xs leading-5 ${active ? 'text-slate-300' : 'text-slate-500'}`}>{item.description}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:p-7">
            <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">{current.eyebrow}</p>
                <h3 className="mt-1 text-xl font-black text-slate-950">{current.title}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <current.icon className="h-5 w-5" />
              </div>
            </div>

            {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <Input id="email" type="email" autoComplete="email" autoFocus placeholder={isPlayer ? 'tuemail@correo.com' : 'matiasceconi@gmail.com'} value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 pl-10" required />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                  <Link to="/forgot-password" className="text-xs font-medium text-slate-500 hover:text-emerald-700">¿Olvidaste tu contraseña?</Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 pl-10" required />
                </div>
              </div>

              <Button type="submit" className="h-12 w-full bg-slate-950 font-bold text-white hover:bg-slate-800" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Ingresando...</> : <>{isPlayer ? 'Ingresar como Jugador' : 'Ingresar como Staff'}<ArrowRight className="ml-2 h-4 w-4" /></>}
              </Button>
            </form>

            <div className="mt-5 border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
              {isPlayer ? (
                <span>Tu acceso personal es habilitado por Score Fútbol.</span>
              ) : (
                <span>¿Todavía no tenés una cuenta? <Link to={`/register?returnTo=${returnToQuery}`} className="font-bold text-emerald-700 hover:underline">Crear cuenta</Link></span>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

function MiniPillar({ icon: Icon, title, text }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
      <Icon className="h-5 w-5 text-emerald-300" />
      <p className="mt-3 text-sm font-bold text-white">{title}</p>
      <p className="mt-1 text-[11px] text-slate-400">{text}</p>
    </div>
  );
}
