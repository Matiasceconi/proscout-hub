import React from 'react';
import AgencyListPage from '@/components/agency/AgencyListPage';
import { Activity } from 'lucide-react';

export default function AgencyPhysical() {
  return (
    <AgencyListPage
      title="Rendimiento físico"
      subtitle="Evaluaciones y datos GPS"
      entityName="PhysicalAssessment"
      icon={Activity}
      columns={[
        { key: 'player_id', label: 'Jugador', render: i => <span className="text-slate-600">{i.player_id}</span> },
        { key: 'assessment_date', label: 'Fecha', date: true },
        { key: 'assessment_type', label: 'Tipo', hideOnMobile: true, render: i => <span className="capitalize text-slate-600">{i.assessment_type}</span> },
        { key: 'cmj', label: 'CMJ', align: 'text-center', hideOnMobile: true },
        { key: 'sprint_30m', label: 'Sprint 30m', align: 'text-center', hideOnMobile: true }
      ]}
    />
  );
}