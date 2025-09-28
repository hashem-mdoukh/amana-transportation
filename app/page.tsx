'use client'
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
// Assuming Tailwind CSS is available globally in the environment.
// Using lucide-react for icons, assumed available.
import { Bus, Map, Clock, Users, Menu, X, LocateFixed } from 'lucide-react';

// API Endpoint (Kept for reference, but fetch logic is skipped to prevent errors)
const API_URL = 'https://www.amanabootcamp.org/api/fs-classwork-data/amana-transportation';
const MAX_RETRIES = 3;

// --- MOCK DATA STRUCTURE (Updated with coordinates for Leaflet) ---
// Coordinates are simulated for the Amman, Jordan area for demonstration.
const MOCK_DATA = [
  {
    id: 'Bus 1',
    status: 'Active',
    passengers: 25,
    nextStop: 'Jerash Stop',
    nextArrivalTime: '09:40',
    stops: [
      { name: 'Jerash Stop', arrivalTime: '09:40', nextArrival: '09:40', coords: [31.95, 35.91] as [number, number], isCurrent: true },
      { name: 'Tuba Stop', arrivalTime: '10:20', nextArrival: '11:20', coords: [31.96, 35.88] as [number, number] },
      { name: 'Pulce Stop', arrivalTime: '11:00', nextArrival: '12:00', coords: [31.98, 35.85] as [number, number] },
      { name: 'Rum Stop', arrivalTime: '11:45', nextArrival: '12:45', coords: [31.99, 35.81] as [number, number] },
    ],
  },
  {
    id: 'Bus 2',
    status: 'Inactive',
    passengers: 0,
    nextStop: 'Old Town',
    nextArrivalTime: '08:00',
    stops: [
      { name: 'Old Town', arrivalTime: '08:00', nextArrival: '09:00', coords: [32.05, 35.79] as [number, number], isCurrent: true },
      { name: 'Mall Center', arrivalTime: '08:30', nextArrival: '09:30', coords: [32.02, 35.82] as [number, number] },
      { name: 'Park Lane', arrivalTime: '09:15', nextArrival: '10:15', coords: [32.00, 35.86] as [number, number] },
    ],
  },
  {
    id: 'Bus 3',
    status: 'Active',
    passengers: 18,
    nextStop: 'Tuba Stop',
    nextArrivalTime: '10:00',
    stops: [
      { name: 'Amman City', arrivalTime: '09:20', nextArrival: '10:20', coords: [31.93, 35.94] as [number, number] },
      { name: 'Tuba Stop', arrivalTime: '10:00', nextArrival: '11:00', coords: [31.96, 35.92] as [number, number], isCurrent: true },
      { name: 'North Gate', arrivalTime: '10:45', nextArrival: '11:45', coords: [31.99, 35.90] as [number, number] },
    ],
  },
  {
    id: 'Bus 4',
    status: 'Active',
    passengers: 12,
    nextStop: 'Main Terminal',
    nextArrivalTime: '12:30',
    stops: [
      { name: 'East Side', arrivalTime: '11:00', nextArrival: '12:00', coords: [31.85, 35.98] as [number, number] },
      { name: 'West Gate', arrivalTime: '11:40', nextArrival: '12:40', coords: [31.88, 36.00] as [number, number] },
      { name: 'Main Terminal', arrivalTime: '12:30', nextArrival: '13:30', coords: [31.91, 35.99] as [number, number], isCurrent: true },
    ],
  },
];


// --- LEAFLET MAP COMPONENT ---

type Stop = {
  name: string;
  arrivalTime: string;
  nextArrival: string;
  coords: [number, number];
  isCurrent?: boolean;
};

type Bus = {
  id: string;
  status: string;
  passengers: number;
  nextStop: string;
  nextArrivalTime: string;
  stops: Stop[];
};

type LeafletMapProps = {
  activeBus: Bus | undefined;
  selectedStopName: string | null;
  handleMapStopClick: (stopName: string) => void;
};

const LeafletMap: React.FC<LeafletMapProps> = ({ activeBus, selectedStopName, handleMapStopClick }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null); // Use 'any' to avoid 'never' type error for .remove()
  const layerGroupRef = useRef<any>(null);
  const initialCenter: [number, number] = [31.95, 35.92]; // Center of Amman
  const initialZoom = 12;

  // 1. Load Leaflet Libraries
  useEffect(() => {
    // Check if Leaflet is already loaded
    if (window.L) return;

    // Load Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    // Load Leaflet JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = initializeMap;
    document.head.appendChild(script);

    // Clean up function (important in a single-page environment)
    return () => {
      document.head.removeChild(link);
      document.head.removeChild(script);
      // Clean up map instance
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 2. Map Initialization
  const initializeMap = useCallback(() => {
    if (!window.L || !mapContainerRef.current) return;

    // Prevent re-initialization
    if (mapRef.current) {
        mapRef.current.remove();
    }

    const map = window.L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: initialZoom,
        zoomControl: false // We can add a custom one if needed
    });

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // Initialize layer group to hold all dynamic elements (markers, polyline)
    layerGroupRef.current = window.L.layerGroup().addTo(map);
    mapRef.current = map;
  }, []);

  // 3. Map Update Logic (Runs when bus/stop selection changes)
  useEffect(() => {
    if (!mapRef.current || !window.L || !activeBus) {
      // If no bus is selected, center on the initial center and clear layers
      if (mapRef.current && layerGroupRef.current) {
        layerGroupRef.current.clearLayers();
        mapRef.current.setView(initialCenter, initialZoom);
      }
      return;
    }

    const map = mapRef.current;
    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();

    const routeCoords = activeBus.stops.map(s => s.coords);

    // Define Custom Icons
    // Pin Icon (for normal stops)
    const PinIcon = window.L.DivIcon.extend({
        options: {
            className: 'custom-pin-icon',
            html: '<div class="text-red-500"><svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="currentColor" stroke="white" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin"><path d="M12 21.7C17.3 17 22 12 22 8A10 10 0 0 0 12 2a10 10 0 0 0 -10 6c0 4 4.7 9 10 13.7z"/><circle cx="12" cy="8" r="3"/></svg></div>',
            iconSize: [30, 30],
            iconAnchor: [15, 30],
            popupAnchor: [0, -30]
        }
    });

    // Bus Icon (for current/selected stop)
    const BusIcon = window.L.DivIcon.extend({
        options: {
            className: 'custom-bus-icon',
            html: '<div class="text-green-600 animate-pulse"><svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="currentColor" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bus"><path d="M19 17h2l.6-2.5a1 1 0 0 0 0-.5V9a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v5c0 .1 0 .2.1 .3L3.5 17h2"/><path d="M22 20H2"/><path d="M6 17v-2"/><path d="M17 17v-2"/><path d="M12 17V7"/><path d="M9 17v-6h6v6"/><path d="M11 11v2"/><path d="M13 11v2"/></svg></div>',
            iconSize: [36, 36],
            iconAnchor: [18, 36],
            popupAnchor: [0, -36]
        }
    });


    // 1. Draw the Red Route Line
    window.L.polyline(routeCoords, { color: 'red', weight: 4, opacity: 0.7 }).addTo(layerGroup);

    // 2. Add Markers for each stop
    let markers = [];
    activeBus.stops.forEach(stop => {
      // Determine if this is the currently selected stop
      const isSelected = selectedStopName
        ? stop.name === selectedStopName
        : stop.name === activeBus.nextStop; // Default to nextStop if none explicitly selected

      const icon = isSelected ? new BusIcon() : new PinIcon();

      const marker = window.L.marker(stop.coords, { icon: icon })
        .bindPopup(`<b>${activeBus.id}</b>: ${stop.name}<br/>Next Arrival: ${stop.nextArrival}`)
        .on('click', () => handleMapStopClick(stop.name))
        .addTo(layerGroup);

      markers.push(marker);
      if (isSelected) {
        marker.openPopup();
      }
    });

    // 3. Fit map bounds to the route
    if (routeCoords.length > 0) {
      const bounds = window.L.latLngBounds(routeCoords);
      map.fitBounds(bounds, { padding: [50, 50] });
    }

  }, [activeBus, selectedStopName, handleMapStopClick]);


  return (
    <div className="my-4">
      <div className="relative bg-gray-100 border-2 border-gray-300 rounded-xl overflow-hidden shadow-xl h-96">
        <h3 className="bg-gray-200 text-gray-800 p-3 font-semibold border-b flex items-center">
          <LocateFixed size={18} className="mr-2 text-green-600"/>
          {activeBus ? `Route Map for ${activeBus.id}` : 'Select a Bus to View Route Map'}
        </h3>
        {/* The map will be initialized inside this div */}
        <div id="leaflet-map-container" ref={mapContainerRef} className="h-full w-full">
            {/* Display loading message if Leaflet hasn't initialized the map yet */}
            {!mapRef.current && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50/70 z-10 text-lg font-semibold text-gray-600">
                    Initializing Map...
                </div>
            )}
        </div>
        {activeBus && (
          <div className="absolute top-16 right-4 text-xs p-2 bg-red-100 text-red-700 border border-red-300 rounded-lg shadow-md z-10">
            Current stop is marked with a **Bus Icon**. Click pins for details.
          </div>
        )}
      </div>
    </div>
  );
};


// --- MAIN APP COMPONENT ---
export default function App() {
  const [busesData, setBusesData] = useState<Bus[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [selectedStopName, setSelectedStopName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

 // 1. Data Loading (Now strictly using mock data to prevent "Failed to fetch" errors)
useEffect(() => {
  setLoading(true);
  // Directly use MOCK_DATA with a slight delay to simulate loading state
  const timeout = setTimeout(() => {
    setBusesData(MOCK_DATA);

    // ✅ اضبط الخيار الافتراضي أول باص + أول محطة
    if (MOCK_DATA.length > 0) {
      const firstBus = MOCK_DATA[0];
      setSelectedBusId(firstBus.id);
      if (firstBus.stops.length > 0) {
        setSelectedStopName(firstBus.stops[0].name);
      }
    }

    setLoading(false);
    console.log("Loading completed using mock data.");
  }, 500);

  return () => clearTimeout(timeout);
}, []);



  // 2. Derive Active Bus Data
  const activeBus = useMemo(() => {
    return busesData.find(bus => bus.id === selectedBusId);
  }, [busesData, selectedBusId]);

  // 3. Derive Active Bus Schedule (or default schedule)
  const currentSchedule = useMemo(() => {
    const bus = activeBus || busesData[0]; // Default to Bus 1 if none selected
    return bus ? bus.stops : [];
  }, [activeBus, busesData]);

  // Reset selected stop when bus changes
  useEffect(() => {
    setSelectedStopName(null);
  }, [selectedBusId]);


  // Handler for Bus Selector Clicks
  const handleBusSelect = (busId: string) => {
    if (selectedBusId === busId) {
      // Toggle off if clicking the same bus
      setSelectedBusId(null);
    } else {
      setSelectedBusId(busId);
    }
  };

  // Handler for Map/Schedule Stop Clicks
  const handleStopClick = useCallback((stopName: string) => {
    setSelectedStopName(stopName);
  }, []);

  // --- UI Components Start ---

  const Header = () => (
    <header className="bg-white border-b border-gray-200 shadow-sm fixed top-0 left-0 w-full z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="bg-green-600 p-2 rounded-lg text-white font-extrabold text-xl">Amana Logo</div>
          <h1 className="text-xl font-bold text-gray-800 hidden sm:block">Amana Transportation</h1>
        </div>
        <div className="hidden sm:flex space-x-6 text-gray-700">
          <button className="hover:text-green-600 transition">Overview</button>
          <button className="hover:text-green-600 transition">Routes</button>
          <button className="hover:text-green-600 transition">About</button>
        </div>
        <button
          className="sm:hidden p-2 rounded-full text-gray-700 hover:bg-gray-100"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="sm:hidden border-t">
          <div className="flex flex-col p-4 space-y-2">
            <button className="text-left py-2 hover:bg-gray-50 rounded-md">Overview</button>
            <button className="text-left py-2 hover:bg-gray-50 rounded-md">Routes</button>
            <button className="text-left py-2 hover:bg-gray-50 rounded-md">About</button>
          </div>
        </div>
      )}
    </header>
  );

  const HeroSection = () => (
    <section className="bg-green-600 text-white p-6 sm:p-8 rounded-b-xl shadow-lg mt-16">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-extrabold mb-1">Amana Transportation</h2>
        <p className="text-sm sm:text-base opacity-90">Proudly Serving Jordanian Bus Routes Since 2019</p>
      </div>
    </section>
  );

  const BusSelector = () => (
    <div className="flex flex-wrap gap-2 py-4">
      {loading && <div className="text-gray-500">Loading routes...</div>}
      {busesData.map(bus => (
        <button
          key={bus.id}
          onClick={() => handleBusSelect(bus.id)}
          className={`
            px-4 py-2 text-sm font-semibold rounded-lg transition duration-200 shadow-md
            ${selectedBusId === bus.id
              ? 'bg-red-500 text-white ring-4 ring-red-300 transform scale-[1.02]'
              : 'bg-green-500 text-white hover:bg-green-600 hover:shadow-lg'
            }
          `}
        >
          {bus.id}
        </button>
      ))}
    </div>
  );

  // FIX: Added activeBus to props destructuring
  type BusScheduleProps = {
    schedule: Stop[];
    selectedStopName: string | null;
    activeBus: Bus | undefined;
    handleStopClick: (stopName: string) => void;
  };

  const BusSchedule: React.FC<BusScheduleProps> = ({ schedule, selectedStopName, activeBus, handleStopClick }) => {
    const titleBusId = selectedBusId || 'All Routes';

    return (
      <div className="my-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-3">Bus Schedule ({titleBusId})</h3>

        {schedule.length === 0 ? (
          <div className="text-center p-8 bg-gray-50 border border-gray-200 rounded-lg text-gray-500">
            No schedule available for this selection.
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bus Stop</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Time of Arrival</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {schedule.map((stop) => {
                  const isSelected = selectedStopName
                    ? stop.name === selectedStopName
                    : stop.name === activeBus?.nextStop; // Now activeBus is correctly defined

                  return (
                    <tr
                      key={stop.name}
                      onClick={() => handleStopClick(stop.name)}
                      className={`
                        cursor-pointer transition duration-150 ease-in-out
                        ${isSelected ? 'bg-amber-100 text-amber-900 font-semibold ring-2 ring-amber-500' : 'hover:bg-gray-50'}
                      `}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {stop.name}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isSelected ? 'text-amber-900 font-bold' : 'text-gray-500'}`}>
                        {stop.nextArrival}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {selectedBusId && (
          <p className="mt-3 text-sm text-gray-500 p-2 border-l-4 border-amber-500 bg-amber-50 rounded-r-lg">
            A list of all bus stops and the next arrival time is displayed in the table below. The highlighted row indicates the currently selected/next stop.
          </p>
        )}
      </div>
    );
  };

  const Footer = () => (
    <footer className="bg-gray-800 text-white p-6 mt-12">
      <div className="max-w-7xl mx-auto text-center">
        <p className="text-sm">&copy; {new Date().getFullYear()} Amana Transportation. All rights reserved.</p>
        <p className="text-xs mt-1 opacity-75">Built with React and Tailwind CSS for the Amana Bootcamp.</p>
      </div>
    </footer>
  );

  // --- Main Render ---

  if (loading && busesData.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-lg font-semibold text-green-600">Loading Application Data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-[Inter]">
      <Header />
      <HeroSection />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Bus Selector Section */}
        <section className="mt-8 border-b pb-4">
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Select a Bus Route</h3>
          <BusSelector />
        </section>

        {/* Leaflet Map Section */}
        <section>
          <LeafletMap
            activeBus={activeBus}
            selectedStopName={selectedStopName ?? activeBus?.nextStop ?? null}
            handleMapStopClick={handleStopClick}
          />
        </section>

        {/* Bus Schedule Section */}
        <section>
          <BusSchedule
            schedule={currentSchedule}
            selectedStopName={selectedStopName}
            activeBus={activeBus} // activeBus is passed here
            handleStopClick={handleStopClick}
          />
        </section>
      </main>

      <Footer />
    </div>
  );
}
