import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Task } from '../types';
import { 
  Map as MapIcon, 
  MapPin, 
  ZoomIn, 
  ZoomOut, 
  Navigation, 
  Route, 
  Clock, 
  CheckSquare, 
  Square, 
  Sparkles, 
  Car, 
  Bike, 
  Footprints,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';

// Haversine distance calculator between two geographic coordinates in kilometers
function getHaversineDistance(coords1: { lat: number; lng: number }, coords2: { lat: number; lng: number }): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((coords2.lat - coords1.lat) * Math.PI) / 180;
  const dLng = ((coords2.lng - coords1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coords1.lat * Math.PI) / 180) *
      Math.cos((coords2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Solves the Traveling Salesperson Problem (TSP) exactly or using a greedy approach
function solveTSP(
  start: { lat: number; lng: number } | null,
  tasks: Task[]
): { route: Task[]; distance: number } {
  if (tasks.length === 0) return { route: [], distance: 0 };

  const getDist = (p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) => {
    return getHaversineDistance(p1, p2);
  };

  // If tasks length is small (<= 8), solve exactly using exhaustive search to find the perfect shortest path
  if (tasks.length <= 8) {
    let bestRoute: Task[] = [];
    let minDistance = Infinity;

    const permute = (arr: Task[], memo: Task[] = []) => {
      if (arr.length === 0) {
        let dist = 0;
        let prev = start;
        for (const task of memo) {
          const curr = task.location!;
          if (prev) {
            dist += getDist(prev, curr);
          }
          prev = curr;
        }
        if (dist < minDistance) {
          minDistance = dist;
          bestRoute = [...memo];
        }
        return;
      }
      for (let i = 0; i < arr.length; i++) {
        const curr = arr.slice();
        const next = curr.splice(i, 1);
        permute(curr.slice(), memo.concat(next));
      }
    };

    permute(tasks);
    return { route: bestRoute, distance: minDistance };
  } else {
    // Greedy nearest-neighbor solver for larger task counts to keep UI instantaneous
    const unvisited = [...tasks];
    const route: Task[] = [];
    let currentPos = start;
    let totalDist = 0;

    if (!currentPos && unvisited.length > 0) {
      const first = unvisited.shift()!;
      route.push(first);
      currentPos = first.location!;
    }

    while (unvisited.length > 0) {
      let nearestIdx = -1;
      let minD = Infinity;
      for (let i = 0; i < unvisited.length; i++) {
        const d = getDist(currentPos!, unvisited[i].location!);
        if (d < minD) {
          minD = d;
          nearestIdx = i;
        }
      }
      if (nearestIdx !== -1) {
        const nextTask = unvisited.splice(nearestIdx, 1)[0];
        totalDist += minD;
        route.push(nextTask);
        currentPos = nextTask.location!;
      }
    }

    // Add starting-leg distance if we have a starting node
    if (start && route.length > 0) {
      totalDist += getDist(start, route[0].location!);
    }

    return { route, distance: totalDist };
  }
}

interface TaskMapProps {
  tasks: Task[];
  focusedTask?: Task | null;
}

export default function TaskMap({ tasks, focusedTask }: TaskMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.FeatureGroup | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Search & current location enhancement states
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const searchMarkerRef = useRef<L.Marker | null>(null);

  // Smart Route Planner States
  const [isRoutePanelOpen, setIsRoutePanelOpen] = useState(false);
  const [selectedRouteTaskIds, setSelectedRouteTaskIds] = useState<string[]>([]);
  const [travelMode, setTravelMode] = useState<'driving' | 'cycling' | 'walking'>('driving');
  const [optimizedRoute, setOptimizedRoute] = useState<Task[]>([]);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeDuration, setRouteDuration] = useState<number | null>(null);
  const [startFromUser, setStartFromUser] = useState(false);

  // AI Location Insights States
  const [isAIInsightsPanelOpen, setIsAIInsightsPanelOpen] = useState(false);
  const [aiInsights, setAiInsights] = useState<{
    clusters: Array<{ name: string; taskIds: string[]; description: string }>;
    suggestedSequence: Array<{ taskId: string; reason: string }>;
    warnings: Array<{ type: string; message: string }>;
    productivityScore: number;
    efficiencyExplanation: string;
  } | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState('');

  const routePolylineRef = useRef<L.Polyline | null>(null);

  // We filter tasks that have active location coordinates and are not completed
  const tasksWithLocation = tasks.filter(task => task.location && !task.completed);

  // Helper to zoom & fit map bounds to specific task cluster
  const handleFitClusterBounds = (taskIds: string[]) => {
    const clusterTasks = tasksWithLocation.filter(t => taskIds.includes(t.id));
    const map = mapInstanceRef.current;
    if (map && clusterTasks.length > 0) {
      const coords = clusterTasks.map(t => L.latLng(t.location!.lat, t.location!.lng));
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  };

  // Helper to fly map to specific task and trigger popup
  const handleFlyToTask = (taskId: string) => {
    const task = tasksWithLocation.find(t => t.id === taskId);
    if (task && task.location) {
      const map = mapInstanceRef.current;
      const markersGroup = markersGroupRef.current;
      if (map) {
        map.setView([task.location.lat, task.location.lng], 15);
        if (markersGroup) {
          markersGroup.eachLayer((layer: any) => {
            if (layer && (layer as any).taskId === task.id) {
              layer.openPopup();
            }
          });
        }
      }
    }
  };

  const fetchAIInsights = async () => {
    setIsLoadingInsights(true);
    setInsightsError('');
    try {
      const response = await fetch('/api/analyze-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: tasksWithLocation,
          userLocation: userLocation,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch insights.');
      }

      const data = await response.json();
      setAiInsights(data);
    } catch (err: any) {
      console.error('Error fetching AI Location Insights:', err);
      setInsightsError(err.message || 'Error occurred while loading AI Location Insights.');
    } finally {
      setIsLoadingInsights(false);
    }
  };

  useEffect(() => {
    if (isAIInsightsPanelOpen && tasksWithLocation.length > 0) {
      fetchAIInsights();
    } else if (tasksWithLocation.length === 0) {
      setAiInsights(null);
    }
  }, [isAIInsightsPanelOpen, tasks]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map if it doesn't exist
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [25.5941, 85.1376],
        zoom: 12,
        zoomControl: false, // Custom zoom buttons for better UI design
        attributionControl: false // Minimalist clean map footer
      });

      // Add elegant light tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Create a layer group for markers so we can easily clear/update them
      const markersGroup = L.featureGroup().addTo(map);

      mapInstanceRef.current = map;
      markersGroupRef.current = markersGroup;
    }

    // Clean up map on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersGroupRef.current = null;
      }
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove();
        userLocationMarkerRef.current = null;
      }
      if (searchMarkerRef.current) {
        searchMarkerRef.current.remove();
        searchMarkerRef.current = null;
      }
      if (routePolylineRef.current) {
        routePolylineRef.current.remove();
        routePolylineRef.current = null;
      }
    };
  }, []);

  // Update markers when tasks list changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;

    if (!map || !markersGroup) return;

    // Clear existing markers
    markersGroup.clearLayers();

    if (tasksWithLocation.length === 0) return;

    // Add marker for each task
    tasksWithLocation.forEach(task => {
      if (!task.location) return;

      const { lat, lng, name } = task.location;

      // Custom marker styling classes based on priority
      const colorClass = 
         task.priority === 'high' ? 'bg-rose-500' :
         task.priority === 'medium' ? 'bg-amber-500' :
         'bg-emerald-500';

      const priorityBadge = 
         task.priority === 'high' ? '🔴 High' :
         task.priority === 'medium' ? '🟡 Medium' :
         '🟢 Low';

      const markerIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center w-8 h-8">
            <span class="animate-ping absolute inline-flex h-5 w-5 rounded-full ${colorClass} opacity-50"></span>
            <div class="relative w-5 h-5 rounded-full border-2 border-white dark:border-slate-900 ${colorClass} shadow-md flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
          </div>
        `,
        className: 'custom-leaflet-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -10]
      });

      const descriptionText = task.description ? task.description.replace(/"/g, '&quot;') : 'No description provided.';

      const popupContent = `
        <div class="p-1.5 font-sans text-slate-800 dark:text-slate-100 max-w-[220px]">
          <div class="flex items-center gap-1.5 mb-1.5">
            <span class="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
              task.priority === 'high' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400' :
              task.priority === 'medium' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400' :
              'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
            }">${priorityBadge}</span>
            <span class="text-[9px] font-semibold text-slate-500 dark:text-slate-400">${task.category}</span>
          </div>
          <h4 class="text-xs font-bold text-slate-900 dark:text-white mb-1 leading-snug">${task.title}</h4>
          <p class="text-[10px] text-slate-600 dark:text-slate-300 mb-1.5 leading-relaxed line-clamp-3">${descriptionText}</p>
          <div class="text-[9px] text-slate-500 dark:text-slate-400 mb-1.5 font-medium">📅 Deadline: <span class="font-bold text-slate-700 dark:text-slate-300">${task.deadline}</span></div>
          <div class="flex items-center gap-1 text-[9px] text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/40 px-2 py-1 rounded">
            <svg class="w-2.5 h-2.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <span class="truncate">${name}</span>
          </div>
        </div>
      `;

      const marker = L.marker([lat, lng], { icon: markerIcon })
        .bindPopup(popupContent, { 
          closeButton: false,
          className: 'custom-leaflet-popup'
        })
        .on('click', () => {
          setSelectedTask(task);
        });

      // Attach taskId so we can trigger it programmatically
      (marker as any).taskId = task.id;

      markersGroup.addLayer(marker);
    });

    // Auto-fit bounds if we have markers to show
    if (tasksWithLocation.length > 0) {
      try {
        const bounds = markersGroup.getBounds();
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      } catch (e) {
        const first = tasksWithLocation[0].location!;
        map.setView([first.lat, first.lng], 12);
      }
    }
  }, [tasks, tasksWithLocation.length]);

  // Trigger flyTo and open popup when focusedTask changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !focusedTask) return;

    // Use task coordinates or default to Patna
    const lat = focusedTask.location?.lat ?? 25.5941;
    const lng = focusedTask.location?.lng ?? 85.1376;

    // Pan & zoom smoothly
    map.setView([lat, lng], 15);

    // Find the marker by taskId and open popup
    if (markersGroup) {
      markersGroup.eachLayer((layer: any) => {
        if (layer && (layer as any).taskId === focusedTask.id) {
          layer.openPopup();
        }
      });
    }

    // Scroll map container into view smoothly
    if (mapContainerRef.current) {
      mapContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusedTask]);

  // Keep route selections synced with actual available tasks with location
  useEffect(() => {
    const validIds = tasksWithLocation.map(t => t.id);
    setSelectedRouteTaskIds(prev => {
      if (prev.length === 0) {
        return validIds;
      }
      return prev.filter(id => validIds.includes(id));
    });
  }, [tasks]);

  // Effect to manage the user location marker on the map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !userLocation) return;

    // Clear old user location marker if it exists
    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.remove();
    }

    const blueMarkerIcon = L.divIcon({
      html: `
        <div class="relative flex items-center justify-center w-8 h-8">
          <span class="animate-ping absolute inline-flex h-5 w-5 rounded-full bg-blue-500 opacity-60"></span>
          <div class="relative w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 bg-blue-600 shadow-md flex items-center justify-center">
            <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
          </div>
        </div>
      `,
      className: 'custom-leaflet-user-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -6]
    });

    const marker = L.marker([userLocation.lat, userLocation.lng], { icon: blueMarkerIcon })
      .bindPopup(`
        <div class="p-1 font-sans text-center">
          <div class="text-xs font-bold text-slate-900 dark:text-white">🔵 Your Location</div>
          <p class="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">Lat: ${userLocation.lat.toFixed(4)}, Lng: ${userLocation.lng.toFixed(4)}</p>
        </div>
      `, { closeButton: false })
      .addTo(map);

    userLocationMarkerRef.current = marker;

    return () => {
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove();
        userLocationMarkerRef.current = null;
      }
    };
  }, [userLocation]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setErrorMessage('');

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery.trim()
        )}&limit=1`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch search results.');
      }
      const data = await response.json();
      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        const displayName = result.display_name;

        const map = mapInstanceRef.current;
        if (map) {
          map.setView([lat, lng], 14);

          // Clear old search marker if exists
          if (searchMarkerRef.current) {
            searchMarkerRef.current.remove();
          }

          const searchIcon = L.divIcon({
            html: `
              <div class="relative flex items-center justify-center w-8 h-8 animate-bounce">
                <div class="relative w-5 h-5 rounded-full border-2 border-white dark:border-slate-900 bg-indigo-600 shadow-md flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-white"><circle cx="12" cy="12" r="10"/><path d="m21 21-4.3-4.3"/></svg>
                </div>
              </div>
            `,
            className: 'custom-leaflet-search-marker',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -10]
          });

          const sMarker = L.marker([lat, lng], { icon: searchIcon })
            .bindPopup(`
              <div class="p-1.5 font-sans max-w-[180px]">
                <div class="text-xs font-bold text-slate-900 dark:text-white">🔍 Searched Location</div>
                <div class="text-[9px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-tight">${displayName}</div>
              </div>
            `, { closeButton: false })
            .addTo(map)
            .openPopup();

          searchMarkerRef.current = sMarker;
        }
      } else {
        setErrorMessage('Location not found. Please try a different name.');
        setTimeout(() => setErrorMessage(''), 4000);
      }
    } catch (err) {
      console.error('Error during geocoding search:', err);
      setErrorMessage('Could not search due to network issue.');
      setTimeout(() => setErrorMessage(''), 4000);
    } finally {
      setIsSearching(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser.');
      setTimeout(() => setErrorMessage(''), 4000);
      return;
    }

    setIsLocating(true);
    setErrorMessage('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        const map = mapInstanceRef.current;
        if (map) {
          map.setView([latitude, longitude], 15);
        }
        setIsLocating(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        let msg = 'Failed to retrieve your location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location access denied by user/browser.';
        }
        setErrorMessage(msg);
        setTimeout(() => setErrorMessage(''), 5000);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleRecenter = () => {
    const group = markersGroupRef.current;
    const map = mapInstanceRef.current;
    if (group && map && tasksWithLocation.length > 0) {
      try {
        map.fitBounds(group.getBounds(), { padding: [40, 40], maxZoom: 14 });
      } catch (e) {
        const first = tasksWithLocation[0].location!;
        map.setView([first.lat, first.lng], 12);
      }
    } else if (map) {
      // Default fallback coordinates if no pins exist
      map.setView([25.5941, 85.1376], 12);
    }
  };

  const handleToggleRouteTask = (id: string) => {
    setSelectedRouteTaskIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleOptimizeRoute = () => {
    if (selectedRouteTaskIds.length === 0) {
      setErrorMessage('Please select at least one task to include in the route.');
      setTimeout(() => setErrorMessage(''), 4000);
      return;
    }

    const tasksToOptimize = tasksWithLocation.filter(t => selectedRouteTaskIds.includes(t.id));
    const startPoint = (startFromUser && userLocation) ? userLocation : null;

    const result = solveTSP(startPoint, tasksToOptimize);
    setOptimizedRoute(result.route);
    setRouteDistance(result.distance);

    const speedMap = {
      driving: 35, // 35 km/h
      cycling: 15, // 15 km/h
      walking: 5,  // 5 km/h
    };
    const speed = speedMap[travelMode];
    const timeInMinutes = (result.distance / speed) * 60;
    setRouteDuration(Math.round(timeInMinutes));

    // Draw on Map
    const map = mapInstanceRef.current;
    if (map) {
      // Clear old polyline
      if (routePolylineRef.current) {
        routePolylineRef.current.remove();
      }

      const coords: [number, number][] = [];
      if (startFromUser && userLocation) {
        coords.push([userLocation.lat, userLocation.lng]);
      }
      result.route.forEach(t => {
        if (t.location) {
          coords.push([t.location.lat, t.location.lng]);
        }
      });

      if (coords.length >= 2) {
        const polyline = L.polyline(coords, {
          color: '#6366f1', // Indigo
          weight: 4,
          opacity: 0.85,
          dashArray: '8, 8',
          lineJoin: 'round'
        }).addTo(map);

        routePolylineRef.current = polyline;
        
        try {
          map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
        } catch (e) {
          console.error(e);
        }
      } else if (coords.length === 1 && userLocation) {
        map.setView([userLocation.lat, userLocation.lng], 15);
      }
    }
  };

  const handleClearRoute = () => {
    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }
    setOptimizedRoute([]);
    setRouteDistance(null);
    setRouteDuration(null);
  };

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs flex flex-col h-[520px] w-full">
      {/* Map Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/40 p-2 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <MapIcon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 font-sans">Geographic Task GIS Hub</h2>
            <p className="text-2xs text-slate-400 dark:text-slate-500 font-medium font-mono">Interactive spatial task tracking mapping engine</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Route Planner Toggle Button */}
          <button 
            onClick={() => {
              setIsRoutePanelOpen(!isRoutePanelOpen);
              if (isAIInsightsPanelOpen) setIsAIInsightsPanelOpen(false);
            }}
            className={`rounded-lg p-1.5 border transition-all flex items-center gap-1 text-xs font-bold ${
              isRoutePanelOpen 
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' 
                : 'bg-slate-50 dark:bg-slate-950/50 hover:bg-slate-100 dark:hover:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
            }`}
            title="Toggle Smart Route Planner"
          >
            <Route className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Route Planner</span>
          </button>

          {/* AI Insights Toggle Button */}
          <button 
            onClick={() => {
              setIsAIInsightsPanelOpen(!isAIInsightsPanelOpen);
              if (isRoutePanelOpen) setIsRoutePanelOpen(false);
            }}
            className={`rounded-lg p-1.5 border transition-all flex items-center gap-1 text-xs font-bold ${
              isAIInsightsPanelOpen 
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs' 
                : 'bg-emerald-500/10 dark:bg-emerald-500/5 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            }`}
            title="Toggle AI Location Insights"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">AI Location Insights</span>
          </button>

          <button 
            onClick={handleRecenter}
            disabled={tasksWithLocation.length === 0}
            className="rounded-lg bg-slate-50 dark:bg-slate-950/50 hover:bg-slate-100 dark:hover:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 text-slate-600 dark:text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Recenter Map Bounds"
          >
            <Navigation className="h-3.5 w-3.5" />
          </button>
          <button 
            onClick={handleZoomIn}
            className="rounded-lg bg-slate-50 dark:bg-slate-950/50 hover:bg-slate-100 dark:hover:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 text-slate-600 dark:text-slate-300 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button 
            onClick={handleZoomOut}
            className="rounded-lg bg-slate-50 dark:bg-slate-950/50 hover:bg-slate-100 dark:hover:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 text-slate-600 dark:text-slate-300 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Map Element */}
      <div className="relative flex-1 min-h-[280px] bg-slate-100 dark:bg-slate-950">
        <div ref={mapContainerRef} className="absolute inset-0 z-0 h-full w-full" />

        {/* Floating Search & Location Controls Overlay */}
        <div className="absolute top-3 left-3 right-3 z-[400] flex flex-col sm:flex-row gap-2 max-w-md sm:max-w-lg pointer-events-auto">
          <form onSubmit={handleSearch} className="flex-1 flex gap-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-md">
            <div className="flex-1 relative flex items-center">
              <MapPin className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search city, office, address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent pl-8 pr-3 py-1 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-0 border-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-2 font-bold transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-2xs rounded-xl shadow-xs transition-all flex items-center gap-1 shrink-0 cursor-pointer"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>

          <button
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="flex items-center justify-center gap-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 px-3 py-2.5 sm:py-1.5 rounded-2xl shadow-md text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-950 font-bold text-2xs transition-all shrink-0 cursor-pointer"
            title="Use Current Location"
          >
            <Navigation className={`h-3.5 w-3.5 text-indigo-500 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Locating...' : 'My Location'}</span>
          </button>
        </div>

        {/* Geocoding Error Toast */}
        {errorMessage && (
          <div className="absolute top-16 left-3 right-3 z-[410] bg-rose-50/95 dark:bg-rose-950/95 backdrop-blur-xs border border-rose-200 dark:border-rose-900/60 px-3 py-2 rounded-xl text-xs text-rose-800 dark:text-rose-300 font-bold shadow-md flex items-center gap-1.5 animate-bounce max-w-sm">
            <span className="text-sm">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Selected Task Details Panel overlay */}
        {selectedTask && selectedTask.location && (
          <div className="absolute bottom-3 left-3 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-lg flex flex-col gap-1.5 w-[calc(100%-1.5rem)] sm:w-80 pointer-events-auto">
            <div className="flex items-center justify-between">
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                selectedTask.priority === 'high' ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/40' :
                selectedTask.priority === 'medium' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/40' :
                'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40'
              }`}>
                {selectedTask.priority} priority
              </span>
              <button 
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold px-1 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-white line-clamp-1">{selectedTask.title}</h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{selectedTask.description}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500 dark:text-slate-400 mt-1 border-t border-slate-100 dark:border-slate-800 pt-1.5">
              <span className="flex items-center gap-1 shrink-0">
                <MapPin className="h-3 w-3 text-indigo-500" />
                <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[130px]">{selectedTask.location.name}</span>
              </span>
              <span className="shrink-0 font-medium text-slate-600 dark:text-slate-400">📅 Due <strong className="text-slate-800 dark:text-slate-200">{selectedTask.deadline}</strong></span>
            </div>
          </div>
        )}

        {/* Smart Route Planner Panel overlay */}
        {isRoutePanelOpen && (
          <div className="absolute top-0 right-0 h-full w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-l border-slate-200 dark:border-slate-800 shadow-xl z-[450] flex flex-col pointer-events-auto animate-slide-in">
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-4 shrink-0">
              <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                <Route className="h-4 w-4" />
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 font-sans">Smart Route Planner</h3>
              </div>
              <button 
                onClick={() => setIsRoutePanelOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold p-1 transition-colors cursor-pointer"
                title="Close Route Planner"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {/* Travel Mode Selector */}
              <div>
                <label className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5 font-mono">Travel Mode</label>
                <div className="grid grid-cols-3 gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                  <button
                    type="button"
                    onClick={() => setTravelMode('driving')}
                    className={`py-1.5 rounded-lg flex flex-col items-center gap-1 text-[9px] font-bold transition-all cursor-pointer ${
                      travelMode === 'driving'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/30 dark:border-slate-800/30'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    <Car className="h-3.5 w-3.5" />
                    <span>Drive</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTravelMode('cycling')}
                    className={`py-1.5 rounded-lg flex flex-col items-center gap-1 text-[9px] font-bold transition-all cursor-pointer ${
                      travelMode === 'cycling'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/30 dark:border-slate-800/30'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    <Bike className="h-3.5 w-3.5" />
                    <span>Cycle</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTravelMode('walking')}
                    className={`py-1.5 rounded-lg flex flex-col items-center gap-1 text-[9px] font-bold transition-all cursor-pointer ${
                      travelMode === 'walking'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/30 dark:border-slate-800/30'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    <Footprints className="h-3.5 w-3.5" />
                    <span>Walk</span>
                  </button>
                </div>
              </div>

              {/* Start from user location toggle (only if user location is detected) */}
              {userLocation && (
                <div className="flex items-center justify-between bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-950/40 p-2.5 rounded-xl shrink-0">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-indigo-900 dark:text-indigo-300">Start from My Location</span>
                    <span className="text-[8px] text-indigo-500 dark:text-indigo-400 font-medium">Use your position as the route start</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={startFromUser}
                    onChange={(e) => setStartFromUser(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                  />
                </div>
              )}

              {/* Task Checklist */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">Select Tasks ({selectedRouteTaskIds.length})</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedRouteTaskIds.length === tasksWithLocation.length) {
                        setSelectedRouteTaskIds([]);
                      } else {
                        setSelectedRouteTaskIds(tasksWithLocation.map(t => t.id));
                      }
                    }}
                    className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {selectedRouteTaskIds.length === tasksWithLocation.length ? 'Clear All' : 'Select All'}
                  </button>
                </div>

                {tasksWithLocation.length === 0 ? (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center py-4 bg-slate-50 dark:bg-slate-950/30 rounded-xl border border-slate-100 dark:border-slate-800">
                    No active tasks with map locations.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                    {tasksWithLocation.map((task) => {
                      const isSelected = selectedRouteTaskIds.includes(task.id);
                      return (
                        <div
                          key={task.id}
                          onClick={() => handleToggleRouteTask(task.id)}
                          className={`flex items-center gap-2 p-2 rounded-xl border text-left cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-950 shadow-2xs'
                              : 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-200/60 dark:border-slate-800/40 hover:bg-slate-100/50 dark:hover:bg-slate-950/50'
                          }`}
                        >
                          <div className="shrink-0 text-indigo-600">
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4" />
                            ) : (
                              <Square className="h-4 w-4 text-slate-300 dark:text-slate-700" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[10px] font-bold text-slate-800 dark:text-slate-100 truncate">{task.title}</h4>
                            <span className="text-[8px] text-slate-400 dark:text-slate-500 truncate block mt-0.5">
                              📍 {task.location?.name}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={handleOptimizeRoute}
                  disabled={selectedRouteTaskIds.length === 0}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-800/80 text-white disabled:text-slate-400 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Optimize Route</span>
                </button>

                {optimizedRoute.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearRoute}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-2xs rounded-xl transition-all cursor-pointer"
                  >
                    Clear Path
                  </button>
                )}
              </div>

              {/* Stats Block */}
              {routeDistance !== null && (
                <div className="bg-indigo-50/40 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/40 p-3 flex flex-col gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400">
                    <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                    <span className="text-[9px] font-extrabold uppercase tracking-wide font-mono">Optimized Path Solution</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800/60">
                      <span className="text-[8px] text-slate-400 dark:text-slate-500 block font-medium">Est. Distance</span>
                      <strong className="text-xs font-black text-slate-800 dark:text-slate-200">
                        {routeDistance >= 1 ? `${routeDistance.toFixed(1)} km` : `${(routeDistance * 1000).toFixed(0)} m`}
                      </strong>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800/60">
                      <span className="text-[8px] text-slate-400 dark:text-slate-500 block font-medium">Est. Duration</span>
                      <strong className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-emerald-500 shrink-0" />
                        <span>{routeDuration} min</span>
                      </strong>
                    </div>
                  </div>

                  {/* Route sequence list */}
                  <div className="mt-1 border-t border-slate-100 dark:border-slate-800 pt-2">
                    <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2 font-mono">Optimized Sequence:</span>
                    <div className="flex flex-col gap-1.5 pl-1">
                      {startFromUser && userLocation && (
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center font-extrabold text-[8px] shrink-0 shadow-xs">S</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400 truncate">Your Location</span>
                        </div>
                      )}
                      {optimizedRoute.map((task, idx) => (
                        <div key={task.id} className="flex flex-col text-[10px]">
                          {(idx > 0 || (startFromUser && userLocation)) && (
                            <div className="h-1.5 w-[2px] bg-indigo-200 dark:bg-indigo-900 ml-2 mb-0.5" />
                          )}
                          <div className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center font-extrabold text-[8px] shrink-0 shadow-xs">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate" title={task.title}>{task.title}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {isAIInsightsPanelOpen && (
          <div className="absolute top-0 right-0 h-full w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-l border-slate-200 dark:border-slate-800 shadow-xl z-[450] flex flex-col pointer-events-auto animate-slide-in">
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-4 shrink-0">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <Sparkles className="h-4 w-4 animate-pulse" />
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 font-sans">AI Location Insights</h3>
              </div>
              <button 
                onClick={() => setIsAIInsightsPanelOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold p-1 transition-colors cursor-pointer"
                title="Close AI Insights"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {isLoadingInsights ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                  <div className="relative w-12 h-12 mb-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-30"></span>
                    <div className="relative w-12 h-12 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-emerald-500 animate-pulse" />
                    </div>
                  </div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Generating Spatial Insights...</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 max-w-[200px]">TaskPilot AI is analyzing task clusters, distance separation, and route efficiency.</p>
                </div>
              ) : insightsError ? (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 rounded-2xl flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-rose-800 dark:text-rose-400 font-bold text-xs">
                    <AlertCircle className="h-4 w-4" />
                    <span>Analysis Error</span>
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">{insightsError}</p>
                  <button 
                    onClick={fetchAIInsights}
                    className="mt-1 py-1.5 px-3 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/60 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-300 font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
                  >
                    Retry Analysis
                  </button>
                </div>
              ) : aiInsights ? (
                <div className="space-y-4">
                  
                  {/* Productivity Score */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                    <div className="relative w-12 h-12 shrink-0 flex items-center justify-center font-black text-sm border-2 border-emerald-500/30 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      {aiInsights.productivityScore}
                    </div>
                    <div>
                      <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-mono">Travel Productivity</span>
                      <strong className="text-xs text-slate-800 dark:text-slate-200 block">
                        {aiInsights.productivityScore >= 80 ? 'Optimal Travel Path' : aiInsights.productivityScore >= 50 ? 'Moderate Dispersion' : 'High Transit Overhead'}
                      </strong>
                    </div>
                  </div>

                  {/* Explanation text */}
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50/50 dark:bg-slate-950/20 p-2.5 rounded-xl border border-slate-100/60 dark:border-slate-800/40">
                    {aiInsights.efficiencyExplanation}
                  </p>

                  {/* Warnings section */}
                  {aiInsights.warnings && aiInsights.warnings.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-mono">Travel warnings ({aiInsights.warnings.length})</span>
                      <div className="space-y-1.5">
                        {aiInsights.warnings.map((w, index) => (
                          <div key={index} className={`p-2.5 rounded-xl border flex gap-2 ${
                            w.type === 'HIGH_PRIORITY_GAP' || w.type === 'HIGH_PRIORITY_FAR_APART'
                              ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-100 dark:border-rose-950/40 text-rose-800 dark:text-rose-400' 
                              : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-100 dark:border-amber-950/40 text-amber-800 dark:text-amber-400'
                          }`}>
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                            <div className="flex-1 text-[10px] font-medium leading-relaxed">{w.message}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Task Clusters */}
                  {aiInsights.clusters && aiInsights.clusters.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-mono font-bold">Detected Clusters ({aiInsights.clusters.length})</span>
                      <div className="space-y-2">
                        {aiInsights.clusters.map((c, index) => (
                          <div 
                            key={index}
                            onClick={() => handleFitClusterBounds(c.taskIds)}
                            className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 hover:bg-slate-100/50 dark:hover:bg-slate-950/40 transition-all cursor-pointer text-left group"
                          >
                            <div className="flex justify-between items-center mb-1">
                              <h4 className="text-[10px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{c.name}</h4>
                              <span className="text-[8px] bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-md font-extrabold font-mono shrink-0">
                                {c.taskIds.length} tasks
                              </span>
                            </div>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-snug mb-1.5">{c.description}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {c.taskIds.map(id => {
                                const t = tasksWithLocation.find(item => item.id === id);
                                if (!t) return null;
                                return (
                                  <span key={id} className="text-[8px] bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-md truncate max-w-[110px]">
                                    {t.title}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested Best Sequence */}
                  {aiInsights.suggestedSequence && aiInsights.suggestedSequence.length > 0 && (
                    <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                      <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-mono">Suggested Sequence</span>
                      <div className="flex flex-col gap-2 pl-1">
                        {aiInsights.suggestedSequence.map((step, idx) => {
                          const task = tasksWithLocation.find(t => t.id === step.taskId);
                          if (!task) return null;
                          return (
                            <div key={step.taskId} className="flex flex-col text-[10px]">
                              {idx > 0 && (
                                <div className="h-2 w-[2px] bg-emerald-200 dark:bg-emerald-900/60 ml-2 mb-0.5" />
                              )}
                              <div 
                                onClick={() => handleFlyToTask(step.taskId)}
                                className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-950/50 cursor-pointer group text-left transition-colors"
                              >
                                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center font-extrabold text-[8px] shrink-0 shadow-2xs group-hover:bg-emerald-500">
                                  {idx + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <h5 className="font-bold text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">{task.title}</h5>
                                  <p className="text-[8px] text-slate-400 dark:text-slate-500 leading-snug mt-0.5">{step.reason}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                  <Sparkles className="h-8 w-8 text-slate-300 dark:text-slate-700 stroke-[1.5] mb-2" />
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Analysis Pending</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 max-w-[200px]">Click the button below to generate deep spatial logistics insights for your mapped tasks.</p>
                  <button 
                    onClick={fetchAIInsights}
                    className="mt-4 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Run Spatial Analysis
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {tasksWithLocation.length === 0 && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-xs text-center">
            <MapPin className="h-8 w-8 text-indigo-500/80 dark:text-indigo-400/80 animate-bounce mb-2" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No active tasks with map pins</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 max-w-[240px]">Create or edit tasks and check the "Pin to GIS Map" option to see them displayed here.</p>
          </div>
        )}
      </div>

      {/* Map Status Bar / Legend */}
      <div className="bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 px-6 py-2.5 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
        <span className="font-semibold">{tasksWithLocation.length} active location markers</span>
        <div className="flex items-center gap-3 font-semibold">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> High</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Medium</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Low</span>
        </div>
      </div>
    </div>
  );
}
