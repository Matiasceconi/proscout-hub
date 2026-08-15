import React from "react";
import { SCORE_FUTBOL_BRAND } from "@/lib/scoreFutbolBrand";

export default function AuthLayout({ title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
      <aside className="relative hidden overflow-hidden px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between" style={{ backgroundColor: SCORE_FUTBOL_BRAND.primaryColor }}>
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-emerald-500/10" aria-hidden="true" />
        <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full border border-white/10" aria-hidden="true" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-20 w-20 items-center justify-center">
            <img src={SCORE_FUTBOL_BRAND.logoUrl} alt={`Logo de ${SCORE_FUTBOL_BRAND.name}`} className="h-full w-full object-contain drop-shadow-[0_10px_22px_rgba(0,0,0,0.35)]" />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight">{SCORE_FUTBOL_BRAND.name}</p>
            <p className="text-xs uppercase tracking-[0.16em] text-emerald-300">{SCORE_FUTBOL_BRAND.descriptor}</p>
          </div>
        </div>

        <div className="relative max-w-xl">
          <h2 className="text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Una plataforma. Dos experiencias.
          </h2>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-300">
            Representantes y jugadores acceden a las herramientas que necesitan para gestionar, comprender y preparar cada desafío.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">Informes descargables</div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">Análisis y coaching</div>
          </div>
        </div>

        <p className="relative text-xs text-slate-500">Acceso exclusivo para usuarios autorizados</p>
      </aside>

      <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-24 w-24 items-center justify-center">
              <img src={SCORE_FUTBOL_BRAND.logoUrl} alt={`Logo de ${SCORE_FUTBOL_BRAND.name}`} className="h-full w-full object-contain drop-shadow-[0_10px_20px_rgba(15,23,42,0.2)]" />
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
