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
  avgTemp?: number;
  gridDistance?: number;
  internetSpeed?: number;
  nbGridConnections?: number;
  internetSpeedNorm?: number;
  gridDistanceNorm?: number;
  nbGridConnectionsNorm?: number;
  avgTempNorm?: number;
  opposition?: "low" | "medium" | "high";
};

type BackendHexagonData = {
  [h3Index: string]: {
    score: number;
    avgTemp: number;
    gridDistance: number;
    [key: string]: any; // Allow additional fields
  };
};

type BackendResponse = {
  hexagonData: BackendHexagonData;
};

interface DatacenterMapProps {
  initialData?: HexData[];
  showLoadingState?: boolean;
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
    const score = Math.random() * 2 - 1; // Random score between -1 and 1
    const avgTemp = 8 + Math.random() * 15; // Temperature between 8-23°C
    const gridDistance = Math.random() * 10; // Distance 0-10km
    
    return {
      hex,
      score: parseFloat(score.toFixed(2)),
      avgTemp: parseFloat(avgTemp.toFixed(1)),
      gridDistance: parseFloat(gridDistance.toFixed(1)),
      internetSpeed: Math.floor(Math.random() * 500 + 300), // 300-800 Mbps
      nbGridConnections: Math.floor(Math.random() * 3 + 2), // 2-4 connections
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
  ({ initialData, showLoadingState = false }, ref) => {
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
          avgTemp: hexInfo.avgTemp ? Number(hexInfo.avgTemp.toFixed(1)) : undefined,
          gridDistance: hexInfo.gridDistance ? Number(hexInfo.gridDistance.toFixed(1)) : undefined,
          internetSpeed: hexInfo.internetSpeed ? Number(hexInfo.internetSpeed.toFixed(0)) : undefined,
          nbGridConnections: hexInfo.nbGridConnections || undefined,
          internetSpeedNorm: hexInfo.internetSpeedNorm ? Number(hexInfo.internetSpeedNorm.toFixed(2)) : undefined,
          gridDistanceNorm: hexInfo.gridDistanceNorm ? Number(hexInfo.gridDistanceNorm.toFixed(2)) : undefined,
          nbGridConnectionsNorm: hexInfo.nbGridConnectionsNorm ? Number(hexInfo.nbGridConnectionsNorm.toFixed(2)) : undefined,
          avgTempNorm: hexInfo.avgTempNorm ? Number(hexInfo.avgTempNorm.toFixed(2)) : undefined,
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
      // H3 hexagon layer on top (only if we have data and not loading)
      ...(hexData.length > 0 && !isLoading ? [
        new H3HexagonLayer<HexData>({
          id: 'h3-hexagons',
          data: hexData,
          getHexagon: (d: HexData) => d.hex,
          getFillColor: (d: HexData) => {
            // Modern color scheme: Blue to Green gradient for better scores
            const score = Math.max(0, Math.min(1, d.score));
            
            if (score < 0.3) {
              // Low scores: Red to Orange
              const t = score / 0.3;
              return [255, Math.round(100 + 155 * t), 50, 220];
            } else if (score < 0.7) {
              // Mid scores: Orange to Yellow
              const t = (score - 0.3) / 0.4;
              return [255, Math.round(255), Math.round(50 + 205 * t), 220];
            } else {
              // High scores: Yellow to Green
              const t = (score - 0.7) / 0.3;
              return [Math.round(255 - 100 * t), 255, Math.round(255 - 155 * t), 220];
            }
          },
          getElevation: (d: HexData) => d.score * 5000, // Height based on score
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
                  ${data.avgTemp ? `<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;"><span style="color: #f87171;">🌡️ Temperature</span><span style="font-weight: 500; color: #f3f4f6;">${data.avgTemp}°C</span></div>` : ''}
                  ${data.internetSpeed ? `<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;"><span style="color: #38bdf8;">🌐 Internet</span><span style="font-weight: 500; color: #f3f4f6;">${data.internetSpeed} Mbps</span></div>` : ''}
                  ${data.gridDistance ? `<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;"><span style="color: #facc15;">⚡ Grid Distance</span><span style="font-weight: 500; color: #f3f4f6;">${data.gridDistance}km</span></div>` : ''}
                  ${data.nbGridConnections ? `<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;"><span style="color: #a3e635;">🔌 Connections</span><span style="font-weight: 500; color: #f3f4f6;">${data.nbGridConnections}</span></div>` : ''}
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
        
        {/* Empty state message */}
        {hexData.length === 0 && !isLoading && (
          <div className="absolute top-6 left-6 bg-white/95 backdrop-blur text-gray-900 px-4 py-3 rounded-lg shadow-lg border border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
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