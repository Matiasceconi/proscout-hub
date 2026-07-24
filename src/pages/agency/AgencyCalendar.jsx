import React from 'react';
import AgencyListPage from '@/components/agency/AgencyListPage';
import { Calendar } from 'lucide-react';

export default function AgencyCalendar() {
  return (
    <AgencyListPage
      title="Calendario"
      subtitle="Eventos de todos los jugadores"
      entityName="CalendarEvent"
      icon={Calendar}
      columns={[
        { key: 'player_name', label: 'Jugador' },
        { key: 'title', label: 'Evento' },
        { key: 'event_type', label: 'Tipo', hideOnMobile: true },
        { key: 'start_date', label: 'Fecha', date: true },
        { key: 'location', label: 'Lugar', hideOnMobile: true }
      ]}
    />
  );
}