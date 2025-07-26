'use client';

import { DeckGL } from '@deck.gl/react';
import { H3HexagonLayer, TileLayer } from '@deck.gl/geo-layers';
import { BitmapLayer } from '@deck.gl/layers';
import { PickingInfo } from '@deck.gl/core';
import { latLngToCell } from 'h3-js';
import { useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';

type HexData = {
  hex: string;
  score: number;
  connection_points?: number;
  latency_ms?: number;
  avg_temperature?: number;
  connection_normalized_score?: number;
  latency_normalized_score?: number;
  temperature_normalized_score?: number;
  opposition?: "low" | "medium" | "high";
};

type LayerType = 'score' | 'connection' | 'latency' | 'temperature';

type BackendHexagonData = {
  [h3Index: string]: {
    score: number;
    connection_points?: number;
    latency_ms?: number;
    avg_temperature?: number;
    connection_normalized_score?: number;
    latency_normalized_score?: number;
    temperature_normalized_score?: number;
    opposition?: "low" | "medium" | "high";
    [key: string]: any; // Allow additional fields
  };
};

type BackendResponse = {
  hexagonData: BackendHexagonData;
};

interface DatacenterMapProps {
  initialData?: HexData[];
  showLoadingState?: boolean;
  activeLayer?: LayerType;
  onLayerChange?: (layer: LayerType) => void;
}

export interface DatacenterMapRef {
  updateMap: (data: BackendResponse) => void;
}

// Generate initial/sample H3 hexagons for France at resolution 7
function generateSampleFranceHexagons(): HexData[] {
  const frenchCities = [
    { lat: 48.8566, lng: 2.3522, name: 'Paris' },
    { lat: 45.7640, lng: 4.8357, name: 'Lyon' },
    { lat: 43.2965, lng: 5.3698, name: 'Marseille' },
    { lat: 47.2184, lng: -1.5536, name: 'Nantes' },
    { lat: 44.8378, lng: -0.5792, name: 'Bordeaux' },
    { lat: 43.6047, lng: 1.4442, name: 'Toulouse' },
    { lat: 49.2583, lng: 4.0317, name: 'Reims' },
    { lat: 45.1885, lng: 5.7245, name: 'Grenoble' },
    { lat: 50.6292, lng: 3.0573, name: 'Lille' },
    { lat: 48.1173, lng: -1.6778, name: 'Rennes' },
    { lat: 47.4784, lng: -0.5632, name: 'Angers' },
    { lat: 43.7102, lng: 7.2620, name: 'Nice' },
  ];

  return frenchCities.map((city, index) => {
    const hex = latLngToCell(city.lat, city.lng, 6);
    
    // Generate varied data for each location
    const score = Math.random(); // Random score between 0 and 1
    const avgTemp = 8 + Math.random() * 15; // Temperature between 8-23°C
    const connectionPoints = Math.floor(Math.random() * 5 + 1); // 1-5 connection points
    const latency = Math.floor(Math.random() * 50 + 10); // 10-60ms latency
    
    return {
      hex,
      score: parseFloat(score.toFixed(2)),
      avg_temperature: parseFloat(avgTemp.toFixed(1)),
      connection_points: connectionPoints,
      latency_ms: latency,
      connection_normalized_score: Math.random(),
      latency_normalized_score: Math.random(),
      temperature_normalized_score: Math.random(),
      opposition: ["low", "medium", "high"][Math.floor(Math.random() * 3)] as "low" | "medium" | "high"
    };
  });
}

const INITIAL_VIEW_STATE = {
  longitude: 2.2137,
  latitude: 46.2276,
  zoom: 6,
  pitch: 45,
  bearing: -20,
  maxZoom: 12,
  minZoom: 4
};

const DatacenterMap = forwardRef<DatacenterMapRef, DatacenterMapProps>(
  ({ initialData, showLoadingState = false, activeLayer = 'score', onLayerChange }, ref) => {
    // State for hexagon data
    const [hexData, setHexData] = useState<HexData[]>(
      initialData || generateSampleFranceHexagons()
    );
    const [isLoading, setIsLoading] = useState(showLoadingState);

    // Data validation function
    const validateHexData = (data: BackendResponse): boolean => {
      if (!data) {
        console.warn('No data provided');
        return true; // Treat as empty data
      }

      if (!data.hexagonData || typeof data.hexagonData !== 'object') {
        console.warn('Missing or invalid hexagonData object, treating as empty');
        return true; // Treat as empty data rather than error
      }

      const hexEntries = Object.entries(data.hexagonData);
      if (hexEntries.length === 0) {
        console.log('No hexagon data provided');
        return true; // Empty data is valid
      }

      // Validate each hex entry
      for (const [hexId, hexInfo] of hexEntries) {
        if (!hexId || typeof hexId !== 'string') {
          console.warn('Invalid H3 hex ID, skipping:', hexId);
          continue; // Skip invalid entries rather than failing
        }

        if (!hexInfo || typeof hexInfo !== 'object') {
          console.warn('Invalid hex data for', hexId, ', skipping:', hexInfo);
          continue; // Skip invalid entries
        }

        const { score } = hexInfo;
        
        if (typeof score !== 'number' || isNaN(score)) {
          console.warn('Invalid score for', hexId, ', using default:', score);
          // Don't fail validation, just warn
        }
      }

      return true; // Always return true, but filter invalid data during transform
    };

    // Transform backend data to component format
    const transformBackendData = (data: BackendResponse): HexData[] => {
      if (!data || !data.hexagonData) return [];

      return Object.entries(data.hexagonData)
        .filter(([hexId, hexInfo]) => {
          // Filter out invalid entries
          return hexId && 
                 typeof hexId === 'string' && 
                 hexInfo && 
                 typeof hexInfo === 'object' &&
                 typeof hexInfo.score === 'number' &&
                 !isNaN(hexInfo.score);
        })
        .map(([hexId, hexInfo]) => ({
          hex: hexId,
          score: Math.max(0, Math.min(1, Number(hexInfo.score.toFixed(2)))), // Clamp to 0-1
          connection_points: hexInfo.connection_points !== null ? hexInfo.connection_points : undefined,
          latency_ms: hexInfo.latency_ms !== null ? hexInfo.latency_ms : undefined,
          avg_temperature: hexInfo.avg_temperature !== null ? hexInfo.avg_temperature : undefined,
          connection_normalized_score: hexInfo.connection_normalized_score !== null && hexInfo.connection_normalized_score !== undefined ? Number(hexInfo.connection_normalized_score.toFixed(2)) : undefined,
          latency_normalized_score: hexInfo.latency_normalized_score !== null && hexInfo.latency_normalized_score !== undefined ? Number(hexInfo.latency_normalized_score.toFixed(2)) : undefined,
          temperature_normalized_score: hexInfo.temperature_normalized_score !== null && hexInfo.temperature_normalized_score !== undefined ? Number(hexInfo.temperature_normalized_score.toFixed(2)) : undefined,
          opposition: hexInfo.opposition || undefined
        }));
    };

    // Update map function
    const updateMap = useCallback((data: BackendResponse): void => {
      try {
        if (!validateHexData(data)) {
          console.warn('Data validation failed, keeping current data');
          return;
        }

        setIsLoading(true);
        const transformedData = transformBackendData(data);
        setHexData(transformedData);
        console.log('Map updated with', transformedData.length, 'hexagons');
      } catch (error) {
        console.error('Error updating map data:', error);
      } finally {
        setIsLoading(false);
      }
    }, []);

    // Expose updateMap function to parent components
    useImperativeHandle(ref, () => ({
      updateMap
    }));

    // updateMap function is exposed via ref using useImperativeHandle

    const layers = [
      // Base map layer using dark Carto style for modern look
      new TileLayer({
        id: 'carto-dark',
        data: 'https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2.png',
        minZoom: 0,
        maxZoom: 19,
        renderSubLayers: (props: any) => {
          const {
            bbox: { west, south, east, north }
          } = props.tile;

          return new BitmapLayer(props, {
            data: undefined,
            image: props.data,
            bounds: [west, south, east, north]
          });
        }
      }),
      // Score layer
      ...(hexData.length > 0 && !isLoading && activeLayer === 'score' ? [
        new H3HexagonLayer<HexData>({
          id: 'h3-hexagons-score',
          data: hexData,
          getHexagon: (d: HexData) => d.hex,
          getFillColor: (d: HexData) => {
            const normalizedValue = Math.max(0, Math.min(1, d.score));
            
            if (normalizedValue < 0.3) {
              const t = normalizedValue / 0.3;
              return [255, Math.round(100 + 155 * t), 50, 220];
            } else if (normalizedValue < 0.7) {
              const t = (normalizedValue - 0.3) / 0.4;
              return [255, Math.round(255), Math.round(50 + 205 * t), 220];
            } else {
              const t = (normalizedValue - 0.7) / 0.3;
              return [Math.round(255 - 100 * t), 255, Math.round(255 - 155 * t), 220];
            }
          },
          getElevation: (d: HexData) => d.score * 5000,
          elevationScale: 1,
          pickable: true,
          stroked: true,
          filled: true,
          extruded: true,
          wireframe: false,
          lineWidthMinPixels: 1,
          getLineColor: (d: HexData) => d.score > 0.8 ? [255, 255, 255, 120] : [255, 255, 255, 60],
          material: {
            ambient: 0.64,
            diffuse: 0.6,
            shininess: 32,
            specularColor: [51, 51, 51]
          },
          transitions: {
            getElevation: 600,
            getFillColor: 300
          }
        })
      ] : []),
      // Connection layer
      ...(hexData.length > 0 && !isLoading && activeLayer === 'connection' ? [
        new H3HexagonLayer<HexData>({
          id: 'h3-hexagons-connection',
          data: hexData,
          getHexagon: (d: HexData) => d.hex,
          getFillColor: (d: HexData) => {
            const value = d.connection_normalized_score || 0;
            const normalizedValue = Math.max(0, Math.min(1, value));
            
            if (normalizedValue < 0.3) {
              const t = normalizedValue / 0.3;
              return [255, Math.round(100 + 155 * t), 50, 220];
            } else if (normalizedValue < 0.7) {
              const t = (normalizedValue - 0.3) / 0.4;
              return [255, Math.round(255), Math.round(50 + 205 * t), 220];
            } else {
              const t = (normalizedValue - 0.7) / 0.3;
              return [Math.round(255 - 100 * t), 255, Math.round(255 - 155 * t), 220];
            }
          },
          getElevation: (d: HexData) => (d.connection_normalized_score || 0) * 5000,
          elevationScale: 1,
          pickable: true,
          stroked: true,
          filled: true,
          extruded: true,
          wireframe: false,
          lineWidthMinPixels: 1,
          getLineColor: (d: HexData) => (d.connection_normalized_score || 0) > 0.8 ? [255, 255, 255, 120] : [255, 255, 255, 60],
          material: {
            ambient: 0.64,
            diffuse: 0.6,
            shininess: 32,
            specularColor: [51, 51, 51]
          },
          transitions: {
            getElevation: 600,
            getFillColor: 300
          }
        })
      ] : []),
      // Latency layer
      ...(hexData.length > 0 && !isLoading && activeLayer === 'latency' ? [
        new H3HexagonLayer<HexData>({
          id: 'h3-hexagons-latency',
          data: hexData,
          getHexagon: (d: HexData) => d.hex,
          getFillColor: (d: HexData) => {
            const value = d.latency_normalized_score || 0;
            const normalizedValue = Math.max(0, Math.min(1, value));
            
            if (normalizedValue < 0.3) {
              const t = normalizedValue / 0.3;
              return [255, Math.round(100 + 155 * t), 50, 220];
            } else if (normalizedValue < 0.7) {
              const t = (normalizedValue - 0.3) / 0.4;
              return [255, Math.round(255), Math.round(50 + 205 * t), 220];
            } else {
              const t = (normalizedValue - 0.7) / 0.3;
              return [Math.round(255 - 100 * t), 255, Math.round(255 - 155 * t), 220];
            }
          },
          getElevation: (d: HexData) => (d.latency_normalized_score || 0) * 5000,
          elevationScale: 1,
          pickable: true,
          stroked: true,
          filled: true,
          extruded: true,
          wireframe: false,
          lineWidthMinPixels: 1,
          getLineColor: (d: HexData) => (d.latency_normalized_score || 0) > 0.8 ? [255, 255, 255, 120] : [255, 255, 255, 60],
          material: {
            ambient: 0.64,
            diffuse: 0.6,
            shininess: 32,
            specularColor: [51, 51, 51]
          },
          transitions: {
            getElevation: 600,
            getFillColor: 300
          }
        })
      ] : []),
      // Temperature layer
      ...(hexData.length > 0 && !isLoading && activeLayer === 'temperature' ? [
        new H3HexagonLayer<HexData>({
          id: 'h3-hexagons-temperature',
          data: hexData,
          getHexagon: (d: HexData) => d.hex,
          getFillColor: (d: HexData) => {
            const value = d.temperature_normalized_score || 0;
            const normalizedValue = Math.max(0, Math.min(1, value));
            
            if (normalizedValue < 0.3) {
              const t = normalizedValue / 0.3;
              return [255, Math.round(100 + 155 * t), 50, 220];
            } else if (normalizedValue < 0.7) {
              const t = (normalizedValue - 0.3) / 0.4;
              return [255, Math.round(255), Math.round(50 + 205 * t), 220];
            } else {
              const t = (normalizedValue - 0.7) / 0.3;
              return [Math.round(255 - 100 * t), 255, Math.round(255 - 155 * t), 220];
            }
          },
          getElevation: (d: HexData) => (d.temperature_normalized_score || 0) * 5000,
          elevationScale: 1,
          pickable: true,
          stroked: true,
          filled: true,
          extruded: true,
          wireframe: false,
          lineWidthMinPixels: 1,
          getLineColor: (d: HexData) => (d.temperature_normalized_score || 0) > 0.8 ? [255, 255, 255, 120] : [255, 255, 255, 60],
          material: {
            ambient: 0.64,
            diffuse: 0.6,
            shininess: 32,
            specularColor: [51, 51, 51]
          },
          transitions: {
            getElevation: 600,
            getFillColor: 300
          }
        })
      ] : [])
    ];

    return (
      <div className="w-full h-screen relative">
        <DeckGL
          initialViewState={INITIAL_VIEW_STATE}
          controller={true}
          layers={layers}
          getTooltip={(info: PickingInfo<HexData>) => {
            if (!info.object) return null;
            
            const data = info.object;
            const scoreColor = data.score > 0.7 ? '#10b981' : data.score > 0.3 ? '#f59e0b' : '#ef4444';
            
            return {
              html: `
                <div style="background: rgba(24,24,27,0.98); color: #e5e7eb; border-radius: 14px; box-shadow: 0 4px 32px 0 rgba(0,0,0,0.45); border: 1.5px solid #23232a; padding: 18px 20px; min-width: 240px; max-width: 320px; font-family: 'Inter', 'Geist', 'sans-serif'; font-size: 15px;">
                  <div style="font-weight: 600; color: #f3f4f6; margin-bottom: 10px; font-size: 15px;">Location <span style="color:#e5e7eb;">${data.hex.slice(-6).toUpperCase()}</span></div>
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #a1a1aa;">Score</span>
                    <span style="font-weight: 700; color: ${scoreColor}; font-size: 16px;">${(data.score * 100).toFixed(0)}%</span>
                  </div>
                  ${data.avg_temperature ? `<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;"><span style="color: #f87171;">🌡️ Temperature</span><span style="font-weight: 500; color: #f3f4f6;">${data.avg_temperature}°C</span></div>` : ''}
                  ${data.connection_points ? `<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;"><span style="color: #38bdf8;">🔌 Connection Points</span><span style="font-weight: 500; color: #f3f4f6;">${data.connection_points}</span></div>` : ''}
                  ${data.latency_ms ? `<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;"><span style="color: #facc15;">⚡ Latency</span><span style="font-weight: 500; color: #f3f4f6;">${data.latency_ms}ms</span></div>` : ''}
                  ${data.opposition ? `<div style="display: flex; align-items: center; justify-content: space-between;"><span style="color: #818cf8;">👥 Opposition</span><span style="font-weight: 500; color: #f3f4f6; text-transform: capitalize;">${data.opposition}</span></div>` : ''}
                </div>
              `,
              style: { 
                fontSize: '14px',
                pointerEvents: 'none',
                zIndex: '1000'
              }
            };
          }}
        />
        
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white/95 backdrop-blur text-gray-900 px-6 py-4 rounded-lg shadow-lg border border-gray-200 flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              <span className="font-medium">Updating map data...</span>
            </div>
          </div>
        )}
        
        {/* Layer Controls */}
        <div className="absolute top-6 left-6 bg-[#18181b]/95 backdrop-blur-sm text-slate-200 px-4 py-3 rounded-lg shadow-lg border border-slate-800">
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium text-slate-300 mb-2">Data Layer</div>
            <div className="flex flex-col gap-1">
              {(['score', 'connection', 'latency', 'temperature'] as LayerType[]).map((layer) => (
                <button
                  key={layer}
                  onClick={() => {
                    onLayerChange?.(layer);
                  }}
                  className={`text-left px-3 py-2 rounded text-sm transition-colors ${
                    activeLayer === layer
                      ? 'bg-slate-700 text-slate-200'
                      : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  {layer === 'score' && '🎯 Overall Score'}
                  {layer === 'connection' && '🔌 Connection Points'}
                  {layer === 'latency' && '⚡ Network Latency'}
                  {layer === 'temperature' && '🌡️ Temperature'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Empty state message */}
        {hexData.length === 0 && !isLoading && (
          <div className="absolute top-6 right-6 bg-[#18181b]/95 backdrop-blur-sm text-slate-200 px-4 py-3 rounded-lg shadow-lg border border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
              <span className="text-sm font-medium">No datacenter data available</span>
            </div>
          </div>
        )}
      </div>
    );
  }
);

DatacenterMap.displayName = 'DatacenterMap';

export default DatacenterMap;