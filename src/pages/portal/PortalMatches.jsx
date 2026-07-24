import React from 'react';
import PortalListPage from '@/components/player/PortalListPage';
import { Trophy } from 'lucide-react';

export default function PortalMatches() {
  return (
    <PortalListPage
      title="Mis partidos"
      entityName="Match"
      icon={Trophy}
      columns={[
        { key: 'opponent', primary: true, render: i => `vs ${i.opponent}` },
        { key: 'match_date', secondary: true, date: true },
        { key: 'competition', secondary: true },
        { key: 'status', badge: true }
      ]}
    />
  );
}