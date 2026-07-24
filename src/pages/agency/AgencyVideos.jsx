import React from 'react';
import AgencyListPage from '@/components/agency/AgencyListPage';
import { Video } from 'lucide-react';

export default function AgencyVideos() {
  return (
    <AgencyListPage
      title="Videos"
      subtitle="Contenido audiovisual"
      entityName="VideoContent"
      icon={Video}
      columns={[
        { key: 'player_name', label: 'Jugador' },
        { key: 'title', label: 'Título' },
        { key: 'category', label: 'Categoría', hideOnMobile: true, render: i => <span className="capitalize text-slate-600">{i.category?.replace('_', ' ')}</span> },
        { key: 'status', label: 'Estado', hideOnMobile: true, render: i => (
          <span className={`px-2 py-0.5 rounded-full text-xs ${i.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {i.status === 'published' ? 'Publicado' : 'Borrador'}
          </span>
        )},
        { key: 'published_date', label: 'Fecha', date: true, hideOnMobile: true }
      ]}
    />
  );
}