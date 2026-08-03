import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { DIRECTOR_ROLE_LABELS, DIRECTOR_STATUS_LABELS, DIRECTOR_STATUS_COLORS, PORTAL_STATUS_LABELS, PORTAL_STATUS_COLORS, formatDate, calculateAge } from '@/lib/roleUtils';
import { Badge } from '@/components/shared/UIBits';

export default function DirectorSummary({ director }) {
  const age = calculateAge(director.birth_date);
  const [clubName, setClubName] = useState(null);

  useEffect(() => {
    if (director.current_club_id) {
      base44.entities.Club.get(director.current_club_id)
        .then(c => setClubName(c?.club_name || null))
        .catch(() => setClubName(null));
    }
  }, [director.current_club_id]);

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <InfoCard title="Datos personales">
          <InfoRow label="Nombre completo" value={`${director.first_name} ${director.last_name}`} />
          <InfoRow label="Fecha de nacimiento" value={director.birth_date ? `${formatDate(director.birth_date)} (${age ? `${age} años` : ''})` : '—'} />
          <InfoRow label="Nacionalidad" value={director.nationality || '—'} />
          <InfoRow label="País de residencia" value={director.country_of_residence || '—'} />
          <InfoRow label="Idiomas" value={director.languages || '—'} />
        </InfoCard>
        <InfoCard title="Información profesional">
          <InfoRow label="Rol principal" value={DIRECTOR_ROLE_LABELS[director.primary_role] || '—'} />
          <InfoRow label="Licencia" value={director.coaching_license || '—'} />
          <InfoRow label="Club actual" value={clubName || director.current_club || '—'} />
          <InfoRow label="Último club" value={director.last_club || '—'} />
          <InfoRow label="Competencia" value={director.competition || '—'} />
          <InfoRow label="Ingreso a la agencia" value={director.joined_date ? formatDate(director.joined_date) : '—'} />
        </InfoCard>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <InfoCard title="Estado y representación">
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge className={DIRECTOR_STATUS_COLORS[director.professional_status] || 'bg-slate-100 text-slate-600 border-slate-200'}>
              {DIRECTOR_STATUS_LABELS[director.professional_status] || 'Disponible'}
            </Badge>
            <Badge className={PORTAL_STATUS_COLORS[director.portal_status] || 'bg-slate-100 text-slate-500 border-slate-200'}>
              {PORTAL_STATUS_LABELS[director.portal_status] || 'Sin invitar'}
            </Badge>
          </div>
          <InfoRow label="Representante" value={director.representative_name || '—'} />
          <InfoRow label="Email" value={director.email || '—'} />
          <InfoRow label="Teléfono" value={director.phone || '—'} />
        </InfoCard>
        <InfoCard title="Modelo de juego">
          <InfoRow label="Sistema táctico" value={director.preferred_tactical_system || '—'} />
          <div className="py-1.5 border-b border-slate-50 last:border-0">
            <p className="text-slate-400 text-sm mb-1">Modelo de juego</p>
            <p className="text-slate-700 text-sm">{director.game_model || '—'}</p>
          </div>
        </InfoCard>
      </div>

      {director.biography && (
        <InfoCard title="Biografía profesional">
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{director.biography}</p>
        </InfoCard>
      )}

      {director.main_achievements && (
        <InfoCard title="Logros principales">
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{director.main_achievements}</p>
        </InfoCard>
      )}

      {director.presentation_url && (
        <InfoCard title="Presentación / CV">
          <a href={director.presentation_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">
            {director.presentation_url}
          </a>
        </InfoCard>
      )}
    </div>
  );
}

function InfoCard({ title, children }) {
  return (
    <div className="border border-slate-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between py-1.5 text-sm border-b border-slate-50 last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-700 font-medium text-right">{value}</span>
    </div>
  );
}