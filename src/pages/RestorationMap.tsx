import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  GoogleMap, 
  useJsApiLoader, 
  HeatmapLayer, 
  Marker, 
  InfoWindow 
} from '@react-google-maps/api';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Submission } from '../types';
import { 
  Map as MapIcon, 
  Flame, 
  Info, 
  Layers, 
  Navigation, 
  Trophy, 
  MapPin,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const MAP_CENTER = { lat: 22.5937, lng: 78.9629 };
const INDIA_BOUNDS = {
  north: 37.6,
  south: 6.5,
  west: 68.7,
  east: 97.25,
};

const COASTAL_POINTS = [
  {
    id: 'mumbai',
    name: 'Mumbai Coast',
    lat: 19.0760,
    lng: 72.8777,
    priority: 'High',
    weight: 80,
    color: 'red',
    action: 'Recommended: Mangrove plantation'
  },
  {
    id: 'chennai',
    name: 'Chennai Coast',
    lat: 13.0827,
    lng: 80.2707,
    priority: 'Very High',
    weight: 100,
    color: 'red',
    action: 'Recommended: Seagrass restoration'
  },
  {
    id: 'surat',
    name: 'Surat Coast',
    lat: 21.1702,
    lng: 72.8311,
    priority: 'Moderate',
    weight: 50,
    color: 'orange',
    action: 'Recommended: Coastal buffer zone creation'
  }
];

const LIBRARIES: ("visualization")[] = ["visualization"];

const RestorationMap = () => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: LIBRARIES,
  });

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [viewMode, setViewMode] = useState<'pins' | 'heatmap'>('pins');
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<typeof COASTAL_POINTS[0] | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'verified_projects'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const subs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
      setSubmissions(subs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'verified_projects');
    });
    return () => unsubscribe();
  }, []);

  // Convert coastal points to heatmap data
  const heatmapData = useMemo(() => {
    if (!isLoaded || !window.google || !window.google.maps) return [];

    return COASTAL_POINTS.map(point => ({
      location: new google.maps.LatLng(point.lat, point.lng),
      weight: point.weight
    }));
  }, [isLoaded]);

  const verifiedProjects = useMemo(() => submissions, [submissions]);

  const mapOptions = useMemo(() => ({
    mapTypeId: 'hybrid',
    disableDefaultUI: true,
    zoomControl: true,
    restriction: {
      latLngBounds: INDIA_BOUNDS,
      strictBounds: false,
    },
    styles: [
      {
        featureType: "all",
        elementType: "labels",
        stylers: [{ visibility: "on" }]
      }
    ]
  }), []);

  if (!isLoaded) return (
    <div className="h-[calc(100vh-12rem)] flex items-center justify-center bg-slate-50/50 rounded-3xl border border-slate-100">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-12rem+200px)] flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Navigation className="text-emerald-600 w-8 h-8" />
            Environmental Intelligence
          </h2>
          <p className="text-slate-500 mt-1">Real-time satellite monitoring and restoration priority analysis.</p>
        </div>

        {/* View Toggle */}
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
          <button
            onClick={() => setViewMode('pins')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
              viewMode === 'pins' 
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" 
                : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <MapPin className="w-4 h-4" /> Show Pins
          </button>
          <button
            onClick={() => setViewMode('heatmap')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
              viewMode === 'heatmap' 
                ? "bg-red-600 text-white shadow-lg shadow-red-200" 
                : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <Flame className="w-4 h-4" /> Show Heatmap
          </button>
        </div>
      </div>

      <div className="flex-1 glass-card rounded-3xl shadow-sm border border-slate-100 overflow-hidden relative">
        <GoogleMap
          mapContainerClassName="w-full h-full"
          center={MAP_CENTER}
          zoom={5}
          options={mapOptions}
        >
          {viewMode === 'pins' ? (
            <>
              {/* Sample Coastal Points */}
              {COASTAL_POINTS.map((point) => (
                <Marker
                  key={point.id}
                  position={{ lat: point.lat, lng: point.lng }}
                  onClick={() => setSelectedPoint(point)}
                  animation={google.maps.Animation.DROP}
                  icon={{
                    url: `https://maps.google.com/mapfiles/ms/icons/${point.color}-dot.png`
                  }}
                />
              ))}

              {selectedPoint && (
                <InfoWindow
                  position={{ lat: selectedPoint.lat, lng: selectedPoint.lng }}
                  onCloseClick={() => setSelectedPoint(null)}
                >
                  <div className="w-64 p-2">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn(
                        "w-3 h-3 rounded-full",
                        selectedPoint.color === 'red' ? "bg-red-500" : "bg-orange-500"
                      )} />
                      <h4 className="font-bold text-slate-900">{selectedPoint.name}</h4>
                    </div>
                    <p className="text-xs font-bold text-slate-600 mb-1">{selectedPoint.priority} restoration needed</p>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Suggested Action</p>
                      <p className="text-xs text-slate-700 leading-relaxed">{selectedPoint.action}</p>
                    </div>
                  </div>
                </InfoWindow>
              )}

              {verifiedProjects.map((sub) => (
                <Marker
                  key={sub.id}
                  position={{ lat: sub.latitude, lng: sub.longitude }}
                  onClick={() => setSelectedSub(sub)}
                  icon={{
                    url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
                  }}
                />
              ))}
              {selectedSub && (
                <InfoWindow
                  position={{ lat: selectedSub.latitude, lng: selectedSub.longitude }}
                  onCloseClick={() => setSelectedSub(null)}
                >
                  <div className="w-64 p-1">
                    <div className="aspect-video rounded-lg overflow-hidden mb-3">
                      <img src={selectedSub.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                        {selectedSub.type}
                      </span>
                      <span className="text-slate-400 text-xs flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {selectedSub.latitude.toFixed(2)}, {selectedSub.longitude.toFixed(2)}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 mb-2 leading-tight">{selectedSub.description}</h4>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <img 
                          src={selectedSub.userPhoto || `https://ui-avatars.com/api/?name=${selectedSub.userName}&background=005576&color=fff`} 
                          className="w-6 h-6 rounded-full" 
                          alt="" 
                        />
                        <span className="text-xs font-medium text-slate-600">{selectedSub.userName}</span>
                      </div>
                      <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs">
                        <Trophy className="w-3 h-3" />
                        {selectedSub.creditsAssigned}
                      </div>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </>
          ) : (
            <HeatmapLayer
              data={heatmapData}
              options={{
                radius: 40,
                opacity: 0.7,
                gradient: [
                  'rgba(0, 255, 0, 0)',
                  'green',
                  'orange',
                  'red'
                ]
              }}
            />
          )}
        </GoogleMap>

        {/* Legend */}
        <div className="absolute bottom-8 left-8 bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-2xl z-10">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Layers className="w-3 h-3 text-emerald-600" />
            {viewMode === 'pins' ? 'Map Legend' : 'Priority Levels'}
          </h4>
          <div className="space-y-2">
            {viewMode === 'pins' ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full shadow-lg shadow-red-200" />
                  <span className="text-xs font-medium text-slate-600">High Priority Zone</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-orange-500 rounded-full shadow-lg shadow-orange-200" />
                  <span className="text-xs font-medium text-slate-600">Moderate Priority Zone</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-lg shadow-emerald-200" />
                  <span className="text-xs font-medium text-slate-600">Verified Restoration Site</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full shadow-lg shadow-red-200" />
                  <span className="text-xs font-medium text-slate-600">High Restoration Need</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-orange-500 rounded-full shadow-lg shadow-orange-200" />
                  <span className="text-xs font-medium text-slate-600">Medium Priority</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-lg shadow-emerald-200" />
                  <span className="text-xs font-medium text-slate-600">Safe / Low Priority</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Info Card */}
        <div className="absolute top-8 right-8 max-w-[240px] bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-2xl z-10 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold uppercase tracking-widest">Intelligence</h4>
          </div>
          <p className="text-[10px] text-white/70 leading-relaxed">
            {viewMode === 'pins' 
              ? "Showing all verified blue carbon restoration projects currently active in the registry."
              : "Heatmap indicates restoration urgency based on coastal priority data and environmental stress."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RestorationMap;
