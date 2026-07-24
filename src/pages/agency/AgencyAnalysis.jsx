import React from 'react';
import AgencyListPage from '@/components/agency/AgencyListPage';
import { Search } from 'lucide-react';

export default function AgencyAnalysis() {
  return (
    <AgencyListPage
      title="Análisis de rivales"
      subtitle="Informes de oponentes"
      entityName="OpponentAnalysis"
      icon={Search}
      columns={[
        { key: 'player_name', label: 'Jugador' },
        { key: 'opponent_player_name', label: 'Rival' },
        { key: 'opponent_team', label: 'Equipo', hideOnMobile: true },
        { key: 'status', label: 'Estado', hideOnMobile: true, render: i => (
          <span className={`px-2 py-0.5 rounded-full text-xs ${i.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {i.status === 'published' ? 'Publicado' : 'Borrador'}
          </span>
        )},
        { key: 'marked_as_seen', label: 'Visto', hideOnMobile: true, render: i => i.marked_as_seen ? '✓' : '—' }
      ]}
    />
  );
}