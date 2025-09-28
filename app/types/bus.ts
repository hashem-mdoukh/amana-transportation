export interface CompanyInfo {
  name: string;
  founded: string;
  headquarters: string;
  industry: string;
  description: string;
}

export interface CurrentLocation {
  latitude: number;
  longitude: number;
  address: string;
}

export interface Passengers {
  current: number;
  capacity: number;
  utilization_percentage: number;
}

export interface Driver {
  name: string;
  id: string;
  shift_start: string;
  shift_end: string;
}

export interface BusStop {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  estimated_arrival: string;
  is_next_stop: boolean;
}

export interface Incident {
  id: number;
  type: string;
  description: string;
  reported_by: string;
  reported_time: string;
  status: string;
  priority: string;
}

export interface VehicleInfo {
  license_plate: string;
  model: string;
  year: number;
  fuel_level: number;
  last_maintenance: string;
}

export interface RouteInfo {
  total_distance: number;
  average_speed: number;
  estimated_completion: string;
  frequency_minutes: number;
}

export interface Bus {
  id: number;
  name: string;
  route_number: string;
  current_location: CurrentLocation;
  status: string;
  passengers: Passengers;
  driver: Driver;
  bus_stops: BusStop[];
  incidents: Incident[];
  vehicle_info: VehicleInfo;
  route_info: RouteInfo;
}

export interface OperationalSummary {
  total_buses: number;
  active_buses: number;
  maintenance_buses: number;
  out_of_service_buses: number;
  total_capacity: number;
  current_passengers: number;
  average_utilization: number;
}

export interface Filters {
  available_statuses: string[];
  available_routes: string[];
  applied: {
    status: string | null;
    busId: number | null;
    routeNumber: string | null;
  };
}

export interface BusApiResponse {
  message: string;
  company_info: CompanyInfo;
  bus_lines: Bus[];
  operational_summary: OperationalSummary;
  filters: Filters;
}
