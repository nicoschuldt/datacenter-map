'use client';

import { DeckGL } from '@deck.gl/react';
import { H3HexagonLayer, TileLayer } from '@deck.gl/geo-layers';
import { BitmapLayer } from '@deck.gl/layers';
import { PickingInfo } from '@deck.gl/core';
import { latLngToCell } from 'h3-js';
import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';

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
  onUpdateMap?: (updateMapFunction: (data: BackendResponse) => void) => void;
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
    const hex = latLngToCell(city.lat, city.lng, 7);
    
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
  pitch: 0,
  bearing: 0
};

const DatacenterMap = forwardRef<DatacenterMapRef, DatacenterMapProps>(
  ({ onUpdateMap, initialData, showLoadingState = false }, ref) => {
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
    const updateMap = (data: BackendResponse): void => {
      setIsLoading(true);
      
      try {
        if (!validateHexData(data)) {
          console.error('Data validation failed, keeping current data');
          setIsLoading(false);
          return;
        }

        const transformedData = transformBackendData(data);
        setHexData(transformedData);
        console.log('Map updated with', transformedData.length, 'hexagons');
      } catch (error) {
        console.error('Error updating map data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Expose updateMap function to parent components
    useImperativeHandle(ref, () => ({
      updateMap
    }));

    // Provide updateMap to parent via callback
    useEffect(() => {
      if (onUpdateMap) {
        onUpdateMap(updateMap);
      }
    }, []); // Remove onUpdateMap dependency to prevent infinite loop

    const layers = [
      // Base map layer using free OpenStreetMap tiles
      new TileLayer({
        id: 'osm-tiles',
        data: 'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
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
            // Score from 0 to 1, map to red-green
            const score = Math.max(0, Math.min(1, d.score)); // Clamp to 0-1
            return [
              Math.round(255 * (1 - score)), // Red decreases as score increases
              Math.round(255 * score),       // Green increases as score increases
              0,
              180 // Alpha
            ];
          },
          getElevation: 0,
          pickable: true,
          stroked: true,
          filled: true,
          extruded: false,
          lineWidthMinPixels: 2,
          getLineColor: [255, 255, 255, 100]
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
            return {
              html: `
                <div class="bg-black text-white p-3 rounded max-w-xs">
                  <div class="font-bold text-sm mb-2">Location: ${data.hex.slice(-6)}</div>
                  <div class="space-y-1 text-xs">
                    <div>📊 Score: <span class="font-semibold">${(data.score * 100).toFixed(0)}%</span></div>
                    ${data.avgTemp ? `<div>🌡️ Temperature: ${data.avgTemp}°C</div>` : ''}
                    ${data.internetSpeed ? `<div>🌐 Internet: ${data.internetSpeed} Mbps</div>` : ''}
                    ${data.gridDistance ? `<div>⚡ Grid Distance: ${data.gridDistance}km</div>` : ''}
                    ${data.nbGridConnections ? `<div>🔌 Grid Connections: ${data.nbGridConnections}</div>` : ''}
                    ${data.opposition ? `<div>👥 Opposition: ${data.opposition}</div>` : ''}
                  </div>
                </div>
              `,
              style: { fontSize: '0.8em' }
            };
          }}
        />
        
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
            <div className="bg-white text-black px-4 py-2 rounded shadow-lg">
              Updating map data...
            </div>
          </div>
        )}
        
        {/* Empty state message */}
        {hexData.length === 0 && !isLoading && (
          <div className="absolute top-4 left-4 bg-white text-black px-4 py-2 rounded shadow-lg">
            No datacenter data available
          </div>
        )}
      </div>
    );
  }
);

DatacenterMap.displayName = 'DatacenterMap';

export default DatacenterMap;