'use client'

import { fetchBuses } from "@/app/lib/api";

export default async function BusesPage() {
  const bus_lines = await fetchBuses();
  return (
    <div>
      {(bus_lines.bus_lines || []).map((bus: any) => (
        <div className="border p-2 m-2" key={bus.id}>{bus.name}</div>
      ))}
    </div>
  );
}
