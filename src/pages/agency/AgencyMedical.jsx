import React from 'react';
import AgencyListPage from '@/components/agency/AgencyListPage';
import { HeartPulse } from 'lucide-react';

export default function AgencyMedical() {
  return (
    <AgencyListPage
      title="Área médica"
      subtitle="Lesiones y seguimientos"
      entityName="InjuryRecord"
      icon={HeartPulse}
      columns={[
        { key: 'player_name', label: 'Jugador' },
        { key: 'diagnosis', label: 'Diagnóstico' },
        { key: 'injury_date', label: 'Fecha', date: true, hideOnMobile: true },
        { key: 'status', label: 'Estado', badge: true }
      ]}
    />
  );
}