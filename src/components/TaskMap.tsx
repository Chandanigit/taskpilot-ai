import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Task } from '../types';
import { Map as MapIcon, MapPin, ZoomIn, ZoomOut, Navigation } from 'lucide-react';

interface TaskMapProps {
  tasks: Task[];
  focusedTask?: Task | null;
}

export default function TaskMap({ tasks, focusedTask }: TaskMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.FeatureGroup | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // We filter tasks that have active location coordinates and are not completed
  const tasksWithLocation = tasks.filter(task => task.location && !task.completed);

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

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs flex flex-col h-[500px] w-full">
      {/* Map Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/40 p-2 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <MapIcon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 font-sans">Geographic Task GIS Hub</h2>
            <p className="text-2xs text-slate-400 dark:text-slate-500 font-medium">Interactive spatial task tracking mapping engine</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
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

        {/* Selected Task Details Panel overlay */}
        {selectedTask && selectedTask.location && (
          <div className="absolute bottom-3 left-3 right-3 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-lg flex flex-col gap-1.5 max-w-sm">
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
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold px-1 transition-colors"
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
        <span className="font-medium">{tasksWithLocation.length} active location markers</span>
        <div className="flex items-center gap-3 font-semibold">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> High</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Medium</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Low</span>
        </div>
      </div>
    </div>
  );
}
