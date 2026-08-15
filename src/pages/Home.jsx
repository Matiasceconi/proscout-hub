import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Download,
  Headphones,
  LockKeyhole,
  Radio,
  ShieldCheck,
  Sparkles,
  Swords,
  UserRound,
  Users,
  Video
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { getMyOrganizationContext } from '@/lib/organizationUtils';
import { SCORE_FUTBOL_BRAND } from '@/lib/scoreFutbolBrand';

const benefits = [
  {
    icon: Radio,
    title: 'Partidos en vivo',
    description: 'Seguimiento inmediato de los encuentros que incluyen jugadores representados.'
  },
  {
    icon: BarChart3,
    title: 'Rendimiento con contexto',
    description: 'Estadísticas, evolución y métricas relevantes según la posición del jugador.'
  },
  {
    icon: Download,
    title: 'Informes profesionales',
    description: 'Reportes de rendimiento listos para descargar, presentar y compartir.'
  },
  {
    icon: Swords,
    title: 'Preparación del rival',
    description: 'Información del próximo adversario y puntos clave para preparar cada encuentro.'
  },
  {
    icon: Headphones,
    title: 'Coaching personalizado',
    description: 'Posibilidad de solicitar una reunión virtual cuando el jugador lo necesite.'
  },
  {
    icon: ShieldCheck,
    title: 'Información protegida',
    description: 'Acceso privado y diferenciado para cada rol dentro de Score Fútbol.'
  }
];

const representativeItems = [
  'Cartera completa de representados',
  'Partidos en vivo y próximos encuentros',
  'Estadísticas, informes y documentación',
  'Agenda, alertas y seguimiento ejecutivo'
];

const playerItems = [
  'Rendimiento y evolución personal',
  'Informe profesional descargable',
  'Análisis del próximo rival',
  'Solicitud de coaching virtual'
];

function AccessCard({ type, icon: Icon, title, description, items, cta, featured = false }) {
  const link = `/login?portal=${type}&returnTo=%2F`;

  return (
    <article
      className={`group relative overflow-hidden rounded-[28px] border p-6 transition duration-300 sm:p-8 ${
        featured
          ? 'border-emerald-400/40 bg-emerald-400 text-slate-950 shadow-2xl shadow-emerald-950/20 hover:-translate-y-1'
          : 'border-white/15 bg-white/[0.07] text-white backdrop-blur hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.1]'
      }`}
    >
      <div className={`absolute -right-16 -top-16 h-44 w-44 rounded-full ${
        featured ? 'bg-white/20' : 'bg-emerald-400/10'
      }`} aria-hidden="true" />

      <div className="relative">
        <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl ${
          featured ? 'bg-slate-950 text-emerald-300' : 'border border-white/15 bg-white/10 text-emerald-300'
        }`}>
          <Icon className="h-7 w-7" aria-hidden="true" />
        </div>

        <p className={`mb-2 text-xs font-bold uppercase tracking-[0.2em] ${
          featured ? 'text-emerald-950/70' : 'text-emerald-300'
        }`}>
          Acceso privado
        </p>
        <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h3>
        <p className={`mt-3 min-h-[48px] text-sm leading-6 ${
          featured ? 'text-emerald-950/75' : 'text-slate-300'
        }`}>
          {description}
        </p>

        <ul className="mt-6 space-y-3">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm font-medium">
              <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${
                featured ? 'text-slate-950' : 'text-emerald-300'
              }`} aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <Link
          to={link}
          className={`mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition focus:outline-none focus:ring-4 ${
            featured
              ? 'bg-slate-950 text-white hover:bg-slate-800 focus:ring-slate-950/20'
              : 'bg-white text-slate-950 hover:bg-emerald-50 focus:ring-white/20'
          }`}
        >
          {cta}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

function BenefitCard({ icon: Icon, title, description }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg">
      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="font-bold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </article>
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
        const ctx = await getMyOrganizationContext();
        if (ctx.activeOrg) {
          setRedirect('/agency');
        } else if (ctx.activeItems?.length === 1) {
          const { setActiveOrganization } = await import('@/lib/organizationUtils');
          await setActiveOrganization(ctx.activeItems[0].organization.id);
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
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-white/15 border-t-emerald-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-5 sm:px-8">
          <a href="#inicio" className="flex items-center gap-3 text-white">
            <img
              src={SCORE_FUTBOL_BRAND.logoUrl}
              alt={`Logo de ${SCORE_FUTBOL_BRAND.name}`}
              className="h-16 w-16 object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.35)] sm:h-[72px] sm:w-[72px]"
            />
            <div className="hidden sm:block">
              <p className="text-lg font-bold tracking-tight">{SCORE_FUTBOL_BRAND.name}</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Gestión de representados
              </p>
            </div>
          </a>

          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-300 lg:flex" aria-label="Navegación principal">
            <a href="#plataforma" className="transition hover:text-white">Plataforma</a>
            <a href="#beneficios" className="transition hover:text-white">Beneficios</a>
            <a href="#jugadores" className="transition hover:text-white">Para jugadores</a>
            <a href="#seguridad" className="transition hover:text-white">Seguridad</a>
          </nav>

          <a
            href="#accesos"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-bold text-white backdrop-blur transition hover:bg-white hover:text-slate-950"
          >
            Ingresar
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </header>

      <main>
        <section id="inicio" className="relative overflow-hidden bg-[#0b1426] pb-24 pt-36 text-white sm:pb-32 sm:pt-44">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(7,176,81,0.22),transparent_28%),radial-gradient(circle_at_85%_35%,rgba(52,211,153,0.12),transparent_30%),linear-gradient(135deg,#0b1426_0%,#111f37_55%,#07101e_100%)]" />
          <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)', backgroundSize: '64px 64px' }} aria-hidden="true" />
          <div className="absolute -right-28 top-36 h-[560px] w-[560px] rounded-full border border-emerald-300/10" aria-hidden="true" />
          <div className="absolute -right-8 top-56 h-[360px] w-[360px] rounded-full border border-white/10" aria-hidden="true" />

          <div className="relative mx-auto grid max-w-7xl gap-14 px-5 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Ecosistema digital de Score Fútbol
              </div>

              <h1 className="mt-7 max-w-3xl text-4xl font-black leading-[1.05] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
                Tu carrera, acompañada con
                <span className="block text-emerald-400">información y preparación.</span>
              </h1>

              <p className="mt-7 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                Una plataforma exclusiva para representantes y jugadores de Score Fútbol.
                Rendimiento, próximos rivales, informes profesionales y seguimiento en un solo lugar.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a href="#accesos" className="inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-300">
                  Elegir mi acceso
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
                <a href="#plataforma" className="inline-flex h-13 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10">
                  Conocer la plataforma
                </a>
              </div>

              <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-slate-400">
                <span className="flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-emerald-400" /> Acceso privado</span>
                <span className="flex items-center gap-2"><Activity className="h-4 w-4 text-emerald-400" /> Datos actualizados</span>
                <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Permisos por rol</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl lg:mx-0">
              <div className="absolute -inset-4 rounded-[36px] bg-emerald-400/15 blur-2xl" aria-hidden="true" />
              <div className="relative overflow-hidden rounded-[30px] border border-white/15 bg-white/[0.08] p-4 shadow-2xl backdrop-blur-xl sm:p-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <img src={SCORE_FUTBOL_BRAND.logoUrl} alt="" className="h-11 w-11 object-contain" />
                    <div>
                      <p className="text-sm font-bold">Score Fútbol</p>
                      <p className="text-xs text-slate-400">Centro de rendimiento</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-red-500/15 px-3 py-1.5 text-[11px] font-bold text-red-300">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
                    EN VIVO
                  </span>
                </div>

                <div className="mt-5 rounded-2xl bg-slate-950/55 p-5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Liga Profesional</span>
                    <span>67'</span>
                  </div>
                  <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-center">
                    <div>
                      <div className="mx-auto h-12 w-12 rounded-2xl bg-sky-500/20 ring-1 ring-sky-400/30" />
                      <p className="mt-3 text-sm font-bold">Equipo local</p>
                    </div>
                    <div>
                      <p className="text-3xl font-black">1 — 0</p>
                      <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">Marcador</p>
                    </div>
                    <div>
                      <div className="mx-auto h-12 w-12 rounded-2xl bg-red-500/20 ring-1 ring-red-400/30" />
                      <p className="mt-3 text-sm font-bold">Equipo rival</p>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center gap-3 rounded-xl border border-emerald-300/15 bg-emerald-300/10 p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400 text-sm font-black text-slate-950">10</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold">Representado en cancha</p>
                      <p className="text-[11px] text-emerald-300">Titular · 67 minutos</p>
                    </div>
                    <Activity className="h-5 w-5 text-emerald-300" />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    ['8', 'Partidos'],
                    ['642', 'Minutos'],
                    ['7,2', 'Calificación']
                  ].map(([value, label]) => (
                    <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                      <p className="text-lg font-black text-emerald-300">{value}</p>
                      <p className="mt-1 text-[10px] text-slate-400">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="accesos" className="relative -mt-1 bg-[#0b1426] pb-24 sm:pb-32">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="mb-10 text-center text-white">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Accesos diferenciados</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Elegí cómo ingresar</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                Una misma plataforma segura, con herramientas y contenidos adaptados a cada rol.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <AccessCard
                type="representative"
                icon={Users}
                title="Soy representante"
                description="Control integral de la cartera, con información accionable para acompañar cada carrera."
                items={representativeItems}
                cta="Ingresar como representante"
                featured
              />
              <AccessCard
                type="player"
                icon={UserRound}
                title="Soy jugador"
                description="Un espacio personal para entender tu rendimiento y preparar mejor el próximo desafío."
                items={playerItems}
                cta="Ingresar como jugador"
              />
            </div>

            <p className="mt-6 text-center text-xs text-slate-500">
              El acceso de jugadores es personal y se habilita mediante invitación de Score Fútbol.
            </p>
          </div>
        </section>

        <section id="plataforma" className="bg-slate-50 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">Todo el ecosistema</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Información que se transforma en acompañamiento.
              </h2>
              <p className="mt-5 text-base leading-7 text-slate-600">
                Score Fútbol conecta la gestión de representantes con una experiencia útil para el jugador,
                antes, durante y después de cada partido.
              </p>
            </div>

            <div id="beneficios" className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {benefits.map((benefit) => <BenefitCard key={benefit.title} {...benefit} />)}
            </div>
          </div>
        </section>

        <section id="jugadores" className="overflow-hidden bg-white py-24 sm:py-32">
          <div className="mx-auto grid max-w-7xl gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:items-center">
            <div className="order-2 lg:order-1">
              <div className="rounded-[30px] border border-slate-200 bg-slate-50 p-5 shadow-xl shadow-slate-900/5 sm:p-7">
                <div className="rounded-2xl bg-slate-950 p-6 text-white">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950">
                      <UserRound className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="font-bold">Mi espacio personal</p>
                      <p className="text-xs text-slate-400">Rendimiento y preparación</p>
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white/5 p-4">
                      <BarChart3 className="h-5 w-5 text-emerald-300" />
                      <p className="mt-5 text-sm font-bold">Mi rendimiento</p>
                      <p className="mt-1 text-xs text-slate-400">Evolución por partido</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-4">
                      <Swords className="h-5 w-5 text-emerald-300" />
                      <p className="mt-5 text-sm font-bold">Próximo rival</p>
                      <p className="mt-1 text-xs text-slate-400">Preparación específica</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <Download className="h-5 w-5 text-emerald-600" />
                    <p className="mt-3 text-sm font-bold">Descargar informe</p>
                    <p className="mt-1 text-xs text-slate-500">PDF profesional actualizado</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <Video className="h-5 w-5 text-emerald-700" />
                    <p className="mt-3 text-sm font-bold text-emerald-950">Solicitar coaching</p>
                    <p className="mt-1 text-xs text-emerald-800/70">Reunión virtual personalizada</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">Experiencia del jugador</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
                Llegar al próximo partido mejor preparado.
              </h2>
              <p className="mt-5 text-base leading-7 text-slate-600">
                El jugador accede únicamente a su información: rendimiento, agenda, informes, próximo rival
                y contenidos preparados por Score Fútbol.
              </p>
              <div className="mt-8 space-y-5">
                {[
                  ['Comprender su evolución', 'Indicadores relevantes, partidos recientes y tendencias con contexto.'],
                  ['Preparar al rival', 'Información útil del siguiente adversario y análisis disponible.'],
                  ['Pedir acompañamiento', 'Solicitud de una reunión virtual cuando necesite revisar su rendimiento.']
                ].map(([title, text], index) => (
                  <div key={title} className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-emerald-300">{index + 1}</div>
                    <div>
                      <p className="font-bold text-slate-950">{title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="seguridad" className="bg-emerald-400 py-16 text-slate-950">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-8 w-8" aria-hidden="true" />
                <p className="text-xs font-black uppercase tracking-[0.2em]">Acceso seguro</p>
              </div>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                Cada usuario ve solamente lo que le corresponde.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-950/75">
                Roles, permisos y aislamiento por organización protegen la información de Score Fútbol y de cada representado.
              </p>
            </div>
            <a href="#accesos" className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 text-sm font-bold text-white transition hover:bg-slate-800">
              Ingresar a la plataforma
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>
      </main>

      <footer className="bg-[#07101e] py-10 text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 text-center sm:px-8 md:flex-row md:text-left">
          <div className="flex items-center gap-3">
            <img src={SCORE_FUTBOL_BRAND.logoUrl} alt="" className="h-12 w-12 object-contain" />
            <div>
              <p className="font-bold text-white">{SCORE_FUTBOL_BRAND.name}</p>
              <p className="text-xs">Gestión y acompañamiento de representados</p>
            </div>
          </div>
          <p className="text-xs">Acceso exclusivo para usuarios autorizados · Score Fútbol</p>
        </div>
      </footer>
    </div>
  );
}
