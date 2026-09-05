import React from 'react';
import AlertCard from './AlertCard';
import EmptyState from '../common/EmptyState';
import { BellIcon } from '@heroicons/react/24/outline';

export default function AlertFeed({ alerts }) {
  const hasAlerts = alerts && alerts.length > 0;

  return (
    <div className="space-y-4">
      {hasAlerts ? (
        alerts.map((alert) => (
          <AlertCard key={alert.id || alert.scan_id} alert={alert} />
        ))
      ) : (
        <EmptyState
          title="No alerts logged"
          description="This project has no risk or failure signals logged yet."
          icon={BellIcon}
        />
      )}
    </div>
  );
}
