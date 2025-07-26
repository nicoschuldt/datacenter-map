'use client';

import { useRef, useCallback } from 'react';
import DatacenterMap, { DatacenterMapRef } from './components/DatacenterMap';
import Chat from './components/Chat';

export default function Home() {
  const mapRef = useRef<DatacenterMapRef>(null);

  // Example function to simulate backend data update
  const simulateBackendUpdate = (scenario: 'good' | 'bad' | 'mixed' | 'empty') => {
    let mockBackendResponse;

    switch (scenario) {
      case 'good':
        mockBackendResponse = {
          hexagonData: {
            '871fb4662ffffff': { score: 0.8, avgTemp: 12.5, gridDistance: 1.2 },
            '871f90209ffffff': { score: 0.9, avgTemp: 11.0, gridDistance: 0.8 },
            '873968152ffffff': { score: 0.7, avgTemp: 13.2, gridDistance: 2.1 },
            '87184584effffff': { score: 0.85, avgTemp: 10.8, gridDistance: 1.5 },
          }
        };
        break;
      case 'bad':
        mockBackendResponse = {
          hexagonData: {
            '871fb4662ffffff': { score: -0.8, avgTemp: 25.5, gridDistance: 8.2 },
            '871f90209ffffff': { score: -0.6, avgTemp: 28.0, gridDistance: 9.8 },
            '873968152ffffff': { score: -0.9, avgTemp: 30.2, gridDistance: 12.1 },
            '87184584effffff': { score: -0.7, avgTemp: 26.8, gridDistance: 7.5 },
          }
        };
        break;
      case 'mixed':
        mockBackendResponse = {
          hexagonData: {
            '871fb4662ffffff': { score: 0.4, avgTemp: 15.5, gridDistance: 3.2 },
            '871f90209ffffff': { score: -0.3, avgTemp: 22.0, gridDistance: 6.8 },
            '873968152ffffff': { score: 0.6, avgTemp: 14.2, gridDistance: 2.1 },
            '87184584effffff': { score: -0.1, avgTemp: 18.8, gridDistance: 4.5 },
            '8739601aeffffff': { score: 0.2, avgTemp: 16.1, gridDistance: 3.7 },
            '871fb5231ffffff': { score: -0.4, avgTemp: 21.3, gridDistance: 5.9 },
          }
        };
        break;
      case 'empty':
        mockBackendResponse = {
          hexagonData: {}
        };
        break;
      default:
        return;
    }

    // Use ref method only
    if (mapRef.current) {
      mapRef.current.updateMap(mockBackendResponse);
    }
  };

  const handleMapUpdate = useCallback((hexagonData: any) => {
    // Ensure proper data format
    const backendResponse = {
      hexagonData: hexagonData || {}
    };
    
    // Use setTimeout to avoid calling setState during render
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.updateMap(backendResponse);
      }
    }, 0);
  }, []);

  return (
    <div className="flex w-full h-screen bg-background">
      {/* Map container */}
      <div className="flex-1 relative">
        <DatacenterMap 
          ref={mapRef}
        />
      </div>
      
      {/* Chat sidebar */}
      <div className="w-80 border-l bg-card">
        <Chat onMapUpdate={handleMapUpdate} />
      </div>
    </div>
  );
}