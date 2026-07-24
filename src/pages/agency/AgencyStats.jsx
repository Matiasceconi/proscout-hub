import React from 'react';
import AgencyListPage from '@/components/agency/AgencyListPage';
import { BarChart3 } from 'lucide-react';

export default function AgencyStats() {
  return (
    <AgencyListPage
      title="Estadísticas"
      subtitle="Estadísticas de temporada por jugador"
      entityName="PlayerSeasonStats"
      icon={BarChart3}
      columns={[
        { key: 'player_id', label: 'Jugador', render: i => <span className="text-slate-600">{i.player_id}</span> },
        { key: 'season', label: 'Temporada' },
        { key: 'competition', label: 'Competencia', hideOnMobile: true },
        { key: 'matches', label: 'PJ', align: 'text-center' },
        { key: 'goals', label: 'Goles', align: 'text-center' },
        { key: 'assists', label: 'Asist.', align: 'text-center', hideOnMobile: true },
        { key: 'minutes', label: 'Minutos', align: 'text-center', hideOnMobile: true }
      ]}
    />
  );
}