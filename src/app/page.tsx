'use client';

import { useState, useRef, useCallback } from 'react';
import DatacenterMap, { DatacenterMapRef } from './components/DatacenterMap';
import Chat from './components/Chat';

type LayerType = 'score' | 'connection' | 'latency' | 'temperature';
type ResearchMode = 'analysis' | 'research';

export default function Home() {
  const mapRef = useRef<DatacenterMapRef>(null);
  const [activeLayer, setActiveLayer] = useState<LayerType>('score');
  const [researchMode, setResearchMode] = useState<ResearchMode>('analysis');

  // Example function to simulate backend data update
  const simulateBackendUpdate = (scenario: 'good' | 'bad' | 'mixed' | 'empty') => {
    let mockBackendResponse: any;

    switch (scenario) {
      case 'good':
        mockBackendResponse = {
          hexagonData: {
            '871fb4662ffffff': { 
              score: 0.8, 
              avg_temperature: 12.5, 
              connection_points: 4,
              latency_ms: 15,
              connection_normalized_score: 0.9,
              latency_normalized_score: 0.85,
              temperature_normalized_score: 0.8,
              opposition: 'low' as const
            },
            '871f90209ffffff': { 
              score: 0.9, 
              avg_temperature: 11.0, 
              connection_points: 5,
              latency_ms: 12,
              connection_normalized_score: 0.95,
              latency_normalized_score: 0.9,
              temperature_normalized_score: 0.85,
              opposition: 'low'
            },
            '873968152ffffff': { 
              score: 0.7, 
              avg_temperature: 13.2, 
              connection_points: 3,
              latency_ms: 18,
              connection_normalized_score: 0.7,
              latency_normalized_score: 0.75,
              temperature_normalized_score: 0.7,
              opposition: 'medium'
            },
            '87184584effffff': { 
              score: 0.85, 
              avg_temperature: 10.8, 
              connection_points: 4,
              latency_ms: 14,
              connection_normalized_score: 0.85,
              latency_normalized_score: 0.8,
              temperature_normalized_score: 0.9,
              opposition: 'low'
            },
          }
        };
        break;
      case 'bad':
        mockBackendResponse = {
          hexagonData: {
            '871fb4662ffffff': { 
              score: 0.2, 
              avg_temperature: 25.5, 
              connection_points: 1,
              latency_ms: 45,
              connection_normalized_score: 0.2,
              latency_normalized_score: 0.3,
              temperature_normalized_score: 0.1,
              opposition: 'high'
            },
            '871f90209ffffff': { 
              score: 0.3, 
              avg_temperature: 28.0, 
              connection_points: 2,
              latency_ms: 52,
              connection_normalized_score: 0.3,
              latency_normalized_score: 0.2,
              temperature_normalized_score: 0.05,
              opposition: 'high'
            },
            '873968152ffffff': { 
              score: 0.1, 
              avg_temperature: 30.2, 
              connection_points: 1,
              latency_ms: 58,
              connection_normalized_score: 0.1,
              latency_normalized_score: 0.1,
              temperature_normalized_score: 0.0,
              opposition: 'high'
            },
            '87184584effffff': { 
              score: 0.25, 
              avg_temperature: 26.8, 
              connection_points: 2,
              latency_ms: 48,
              connection_normalized_score: 0.25,
              latency_normalized_score: 0.25,
              temperature_normalized_score: 0.1,
              opposition: 'high'
            },
          }
        };
        break;
      case 'mixed':
        mockBackendResponse = {
          hexagonData: {
            '871fb4662ffffff': { 
              score: 0.4, 
              avg_temperature: 15.5, 
              connection_points: 3,
              latency_ms: 25,
              connection_normalized_score: 0.6,
              latency_normalized_score: 0.5,
              temperature_normalized_score: 0.4,
              opposition: 'medium'
            },
            '871f90209ffffff': { 
              score: 0.3, 
              avg_temperature: 22.0, 
              connection_points: 2,
              latency_ms: 35,
              connection_normalized_score: 0.4,
              latency_normalized_score: 0.3,
              temperature_normalized_score: 0.2,
              opposition: 'medium'
            },
            '873968152ffffff': { 
              score: 0.6, 
              avg_temperature: 14.2, 
              connection_points: 4,
              latency_ms: 20,
              connection_normalized_score: 0.8,
              latency_normalized_score: 0.7,
              temperature_normalized_score: 0.6,
              opposition: 'low'
            },
            '87184584effffff': { 
              score: 0.5, 
              avg_temperature: 18.8, 
              connection_points: 3,
              latency_ms: 28,
              connection_normalized_score: 0.5,
              latency_normalized_score: 0.6,
              temperature_normalized_score: 0.3,
              opposition: 'medium'
            },
            '8739601aeffffff': { 
              score: 0.2, 
              avg_temperature: 16.1, 
              connection_points: 2,
              latency_ms: 32,
              connection_normalized_score: 0.3,
              latency_normalized_score: 0.4,
              temperature_normalized_score: 0.5,
              opposition: 'high'
            },
            '871fb5231ffffff': { 
              score: 0.35, 
              avg_temperature: 21.3, 
              connection_points: 3,
              latency_ms: 38,
              connection_normalized_score: 0.45,
              latency_normalized_score: 0.35,
              temperature_normalized_score: 0.25,
              opposition: 'medium'
            },
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
            activeLayer={activeLayer}
            onLayerChange={setActiveLayer}
          />
        </div>
      
      {/* Chat sidebar */}
      <div className="w-[475px] border-l bg-gradient-to-br from-[#18181b] to-[#23232a]">
        <Chat 
          onMapUpdate={handleMapUpdate} 
          researchMode={researchMode}
          onResearchModeChange={setResearchMode}
        />
      </div>
    </div>
  );
}