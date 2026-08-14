import React from "react";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
      <aside className="relative hidden overflow-hidden bg-slate-950 px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-emerald-500/10" aria-hidden="true" />
        <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full border border-white/10" aria-hidden="true" />

        <div className="relative">
          <span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
            Plataforma privada
          </span>
        </div>

        <div className="relative max-w-xl">
          <h2 className="text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Toda la gestión de representados, en un solo lugar.
          </h2>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-300">
            Información institucional, agenda, partidos, documentos y rendimiento con acceso seguro para cada rol.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">Información centralizada</div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">Permisos por función</div>
          </div>
        </div>

        <p className="relative text-xs text-slate-500">Acceso exclusivo para usuarios autorizados</p>
      </aside>

      <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 shadow-lg shadow-slate-900/10">
              <Icon className="h-7 w-7 text-white" aria-hidden="true" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">{title}</h1>
            {subtitle && <p className="mt-2 text-slate-500">{subtitle}</p>}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            {children}
          </div>
          {footer && (
            <p className="mt-6 text-center text-sm text-slate-500">{footer}</p>
          )}
        </div>
      </main>
    </div>
  );
}
