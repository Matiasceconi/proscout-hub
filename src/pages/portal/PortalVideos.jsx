import React from 'react';
import PortalListPage from '@/components/player/PortalListPage';
import { Video } from 'lucide-react';

export default function PortalVideos() {
  return (
    <PortalListPage
      title="Mis videos"
      entityName="VideoContent"
      icon={Video}
      columns={[
        { key: 'title', primary: true },
        { key: 'published_date', secondary: true, date: true },
        { key: 'category', secondary: true, render: i => i.category?.replace('_', ' ') }
      ]}
    />
  );
}