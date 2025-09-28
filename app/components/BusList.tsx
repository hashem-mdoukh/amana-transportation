// app/components/BusBoxes.tsx
'use client';

import { useEffect, useState } from 'react';
import { Bus } from '../types/bus';

export default function BusBoxes() {
  const [buses, setBuses] = useState<Bus[]>([]);

  useEffect(() => {
    const fetchBuses = async () => {
      const response = await fetch('/api/buses');
      const data = await response.json();
      setBuses(data);
    };

    fetchBuses();
  }, []);

  return (
    <div className="flex flex-wrap gap-4">
      {buses.map((bus) => (
        <div
          key={bus.id}
          className="flex items-center justify-center w-24 h-24 bg-blue-500 text-white rounded-lg shadow-md"
        >
          <span className="text-xs">{bus.id}</span>
          <span className="text-sm font-bold">{bus.route_number}</span>
        </div>
      ))}
    </div>
  );
}
