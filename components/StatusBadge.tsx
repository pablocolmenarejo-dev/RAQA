
import React from 'react';
import { ValidationStatusValue } from '../types';

interface StatusBadgeProps {
  status: ValidationStatusValue;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const statusStyles: { [key in ValidationStatusValue]: string } = {
    'Validado': 'bg-green-100 text-green-800',
    'No Validado': 'bg-red-100 text-red-800',
    'Pendiente de Revisión': 'bg-yellow-100 text-yellow-800',
  };

  return (
    <span
      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
};

export default StatusBadge;
