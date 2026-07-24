import React from 'react';
import AgencyListPage from '@/components/agency/AgencyListPage';
import { Trophy } from 'lucide-react';

export default function AgencyMatches() {
  return (
    <AgencyListPage
      title="Partidos"
      subtitle="Todos los partidos registrados"
      entityName="Match"
      icon={Trophy}
      columns={[
        { key: 'player_name', label: 'Jugador' },
        { key: 'opponent', label: 'Rival' },
        { key: 'competition', label: 'Competencia', hideOnMobile: true },
        { key: 'match_date', label: 'Fecha', date: true },
        { key: 'status', label: 'Estado', hideOnMobile: true, render: i => <span className="capitalize text-slate-600">{i.status}</span> }
      ]}
    />
  );
}