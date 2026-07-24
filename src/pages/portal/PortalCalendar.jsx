import React from 'react';
import PortalListPage from '@/components/player/PortalListPage';
import { Calendar } from 'lucide-react';

export default function PortalCalendar() {
  return (
    <PortalListPage
      title="Mi calendario"
      entityName="CalendarEvent"
      icon={Calendar}
      columns={[
        { key: 'title', primary: true },
        { key: 'start_date', secondary: true, date: true },
        { key: 'location', secondary: true }
      ]}
    />
  );
}