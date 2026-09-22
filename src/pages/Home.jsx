import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { getMyOrganizationContext } from '@/lib/organizationUtils';
import { SCORE_FUTBOL_BRAND } from '@/lib/scoreFutbolBrand';

const pillars = [
  {
    icon: Users,
    title: 'Cartera conectada',
    text: 'Jugadores, clubes, seguimiento y documentación en un mismo entorno.',
  },
  {
    icon: BarChart3,
    title: 'Partidos y rendimiento',
    text: 'Próximos encuentros, minutos y estadísticas para acompañar cada carrera.',
  },
  {
    icon: CalendarDays,
    title: 'Agenda operativa',
    text: 'Lo importante del día, próximos pasos y seguimiento de cada representado.',
  },
];

function AccessCard({ to, icon: Icon, eyebrow, title, description, action, accent = false }) {
  return (
    <Link
      to={to}
      className={`group relative flex min-h-[210px] flex-col overflow-hidden rounded-[28px] border p-6 transition duration-300 sm:p-7 ${
        accent
          ? 'border-emerald-300/35 bg-emerald-400 text-slate-950 shadow-[0_24px_80px_rgba(7,176,81,0.18)] hover:-translate-y-1 hover:bg-emerald-300'
          : 'border-white/15 bg-white/[0.07] text-white backdrop-blur-xl hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.1]'
      }`}
    >
      <div
        className={`absolute -right-16 -top-16 h-44 w-44 rounded-full ${accent ? 'bg-white/20' : 'bg-emerald-400/10'}`}
        aria-hidden="true"
      />

      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
              accent ? 'bg-slate-950 text-emerald-300' : 'border border-white/15 bg-white/10 text-emerald-300'
            }`}
          >
            <Icon className="h-6 w-6" aria-hidden="true" />
          </div>
          <span
            className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
              accent ? 'bg-slate-950/10 text-slate-900' : 'bg-white/10 text-slate-300'
            }`}
          >
            {eyebrow}
          </span>
        </div>

        <div className="mt-7">
          <h2 className="text-2xl font-black tracking-tight sm:text-[28px]">{title}</h2>
          <p className={`mt-2 max-w-sm text-sm leading-6 ${accent ? 'text-emerald-950/75' : 'text-slate-300'}`}>
            {description}
          </p>
        </div>

        <div className="mt-auto pt-6">
          <span className="inline-flex items-center gap-2 text-sm font-black">
            {action}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const [redirect, setRedirect] = useState(null);

  useEffect(() => {
    if (isLoadingAuth || !isAuthenticated) return;

    const routeAuthenticatedUser = async () => {
      const role = user?.app_role || user?.data?.app_role;

      if (role === 'platform_superadmin') {
        setRedirect('/superadmin');
        return;
      }

      if (role === 'player') {
        setRedirect('/portal');
        return;
      }

      try {
        const { base44 } = await import('@/api/base44Client');
        const links = await base44.entities.PlayerUserLink.filter({ user_email: user.email, status: 'pending' });
        if (links.length > 0) {
          setRedirect('/portal/activate');
          return;
        }
      } catch {}

      try {
        const ctx = await getMyOrganizationContext();
        const activeItems = ctx.activeItems || [];
        const preferred = activeItems.find(({ organization }) =>
          organization?.slug === 'score-futbol' ||
          (organization?.name === 'Score Fútbol' && Boolean(organization?.logo_url))
        ) || activeItems[0];

        if (ctx.activeOrg?.id === preferred?.organization?.id) {
          setRedirect('/agency');
        } else if (preferred?.organization?.id) {
          const { setActiveOrganization } = await import('@/lib/organizationUtils');
          await setActiveOrganization(preferred.organization.id);
          setRedirect('/agency');
        } else {
          setRedirect('/company-access');
        }
      } catch {
        setRedirect('/company-access');
      }
    };

    routeAuthenticatedUser();
  }, [isLoadingAuth, isAuthenticated, user]);

  if (isAuthenticated) {
    if (redirect) return <Navigate to={redirect} replace />;
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#07101e]">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-white/15 border-t-emerald-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07101e] text-white">
      <main className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(7,176,81,0.22),transparent_27%),radial-gradient(circle_at_88%_72%,rgba(16,185,129,0.10),transparent_30%),linear-gradient(135deg,#07101e_0%,#0d1a2d_52%,#07101e_100%)]" />
        <div
          className="absolute inset-0 opacity-[0.045]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
          }}
          aria-hidden="true"
        />
        <div className="absolute -right-44 top-20 h-[560px] w-[560px] rounded-full border border-emerald-300/10" aria-hidden="true" />
        <div className="absolute -right-12 top-52 h-[310px] w-[310px] rounded-full border border-white/[0.08]" aria-hidden="true" />

        <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 sm:px-8">
          <header className="flex h-24 items-center justify-between border-b border-white/[0.07]">
            <div className="flex items-center gap-3">
              <img
                src={SCORE_FUTBOL_BRAND.logoUrl}
                alt={`Logo de ${SCORE_FUTBOL_BRAND.name}`}
                className="h-14 w-14 object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.3)]"
              />
              <div>
                <p className="text-lg font-black tracking-tight">{SCORE_FUTBOL_BRAND.name}</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                  Representación · Rendimiento · Seguimiento
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-2 text-xs font-semibold text-slate-400 sm:flex">
              <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              Acceso privado para usuarios autorizados
            </div>
          </header>

          <section className="grid flex-1 gap-12 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-16">
            <div className="max-w-xl">
              <div className="inline-flex items-center rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-300">
                Ecosistema digital de Score Fútbol
              </div>

              <h1 className="mt-7 text-4xl font-black leading-[1.03] tracking-[-0.045em] sm:text-5xl lg:text-[62px]">
                Cada carrera,
                <span className="block text-emerald-400">mejor acompañada.</span>
              </h1>

              <p className="mt-6 max-w-lg text-base leading-7 text-slate-300 sm:text-lg">
                Una plataforma para centralizar la información de los representados, seguir su rendimiento y conectar el trabajo del staff con la experiencia del jugador.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {pillars.map(({ icon: Icon, title, text }) => (
                  <div key={title} className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                    <Icon className="h-5 w-5 text-emerald-300" aria-hidden="true" />
                    <p className="mt-3 text-sm font-bold">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Ingresar</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Elegí tu espacio</h2>
                </div>
                <p className="hidden max-w-[220px] text-right text-xs leading-5 text-slate-400 sm:block">
                  Cada perfil accede únicamente a las herramientas y datos que le corresponden.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <AccessCard
                  to="/login?portal=staff&returnTo=%2F"
                  icon={Users}
                  eyebrow="Staff"
                  title="Acceso Staff"
                  description="Gestión de representados, partidos, estadísticas, agenda y seguimiento de cartera."
                  action="Ingresar como Staff"
                  accent
                />
                <AccessCard
                  to="/login?portal=player&returnTo=%2F"
                  icon={UserRound}
                  eyebrow="Jugador"
                  title="Acceso Jugador"
                  description="Tu espacio personal con partidos, rendimiento, agenda, informes y contenidos de Score."
                  action="Ingresar como Jugador"
                />
              </div>

              <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-5 py-4">
                <p className="text-xs leading-5 text-slate-400">
                  <span className="font-bold text-slate-200">Score Fútbol</span> conecta gestión, seguimiento y datos en una experiencia privada diseñada para la representación de futbolistas.
                </p>
              </div>
            </div>
          </section>

          <footer className="flex flex-col gap-2 border-t border-white/[0.07] py-6 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>Score Fútbol · Plataforma de gestión y acompañamiento de representados</span>
            <span>Acceso exclusivo para usuarios autorizados</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
