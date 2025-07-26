import { NextRequest, NextResponse } from 'next/server';

type AnalyzeRequest = {
  message: string;
};

type HexagonData = {
  [h3Index: string]: {
    score: number;      // 0-1 for color mapping
    internetSpeed?: number;
    gridDistance?: number;
    nbGridConnections?: number;
    avgTemp?: number;
    internetSpeedNorm?: number;
    gridDistanceNorm?: number;
    nbGridConnectionsNorm?: number;
    avgTempNorm?: number;
    opposition?: "low" | "medium" | "high";
  };
};

type AnalyzeResponse = {
  response: string;
  hexagonData: HexagonData;
  highlighted?: string[];  // H3 IDs to emphasize
};

// Mock H3 hex IDs for different regions in France
const MOCK_HEX_IDS = [
  '871fb4662ffffff', // Paris area
  '871f90209ffffff', // Lyon area
  '873968152ffffff', // Marseille area
  '87184584effffff', // Bordeaux area
  '8739601aeffffff', // Toulouse area
  '871fb5231ffffff', // Nantes area
  '871f85432ffffff', // Lille area
  '873a68291ffffff', // Nice area
  '871fb6789ffffff', // Strasbourg area
  '871f91234ffffff', // Grenoble area
  '87186b6caffffff', // Additional mock hex
  '871f9ed92ffffff', // Additional mock hex
];

function generateMockHexagonData(scenario: string): { hexagonData: HexagonData; highlighted: string[] } {
  const data: HexagonData = {};
  const highlighted: string[] = [];
  const numHexagons = Math.floor(Math.random() * 6) + 6; // 6-12 hexagons
  
  // Select random hex IDs
  const selectedHexIds = MOCK_HEX_IDS.sort(() => 0.5 - Math.random()).slice(0, numHexagons);
  
  selectedHexIds.forEach((hexId, index) => {
    let score: number;
    let avgTemp: number;
    let gridDistance: number;
    let internetSpeed: number;
    let nbGridConnections: number;
    let opposition: "low" | "medium" | "high";
    
    if (scenario === 'good') {
      score = Math.random() * 0.4 + 0.6; // 0.6 to 1.0
      avgTemp = Math.random() * 5 + 8; // 8-13°C
      gridDistance = Math.random() * 2 + 0.5; // 0.5-2.5km
      internetSpeed = Math.random() * 200 + 800; // 800-1000 Mbps
      nbGridConnections = Math.floor(Math.random() * 3) + 3; // 3-5 connections
      opposition = Math.random() > 0.7 ? "medium" : "low";
      
      // Mark some as highlighted
      if (score > 0.8 && index < 3) {
        highlighted.push(hexId);
      }
    } else if (scenario === 'bad') {
      score = Math.random() * 0.4 + 0.0; // 0.0 to 0.4
      avgTemp = Math.random() * 10 + 20; // 20-30°C
      gridDistance = Math.random() * 8 + 5; // 5-13km
      internetSpeed = Math.random() * 200 + 100; // 100-300 Mbps
      nbGridConnections = Math.floor(Math.random() * 2) + 1; // 1-2 connections
      opposition = Math.random() > 0.3 ? "high" : "medium";
    } else {
      score = Math.random(); // 0 to 1
      avgTemp = Math.random() * 15 + 8; // 8-23°C
      gridDistance = Math.random() * 10; // 0-10km
      internetSpeed = Math.random() * 700 + 200; // 200-900 Mbps
      nbGridConnections = Math.floor(Math.random() * 4) + 1; // 1-4 connections
      opposition = ["low", "medium", "high"][Math.floor(Math.random() * 3)] as "low" | "medium" | "high";
      
      // Highlight top scores
      if (score > 0.7 && index < 2) {
        highlighted.push(hexId);
      }
    }
    
    // Calculate normalized values (0-1 scale)
    const internetSpeedNorm = Math.min(internetSpeed / 1000, 1);
    const gridDistanceNorm = Math.max(0, 1 - (gridDistance / 15));
    const nbGridConnectionsNorm = Math.min(nbGridConnections / 5, 1);
    const avgTempNorm = Math.max(0, 1 - (avgTemp - 5) / 25);
    
    data[hexId] = {
      score: parseFloat(score.toFixed(2)),
      internetSpeed: parseFloat(internetSpeed.toFixed(0)),
      gridDistance: parseFloat(gridDistance.toFixed(1)),
      nbGridConnections,
      avgTemp: parseFloat(avgTemp.toFixed(1)),
      internetSpeedNorm: parseFloat(internetSpeedNorm.toFixed(2)),
      gridDistanceNorm: parseFloat(gridDistanceNorm.toFixed(2)),
      nbGridConnectionsNorm: parseFloat(nbGridConnectionsNorm.toFixed(2)),
      avgTempNorm: parseFloat(avgTempNorm.toFixed(2)),
      opposition
    };
  });
  
  return { hexagonData: data, highlighted };
}

function analyzeMessage(message: string): { response: string; scenario: string } {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('best') || lowerMessage.includes('good') || lowerMessage.includes('optimal')) {
    return {
      response: "Found optimal datacenter locations with high scores based on low temperature, fast internet, close grid connections, and minimal opposition.",
      scenario: 'good'
    };
  }
  
  if (lowerMessage.includes('temperature') || lowerMessage.includes('cool') || lowerMessage.includes('cold') || lowerMessage.includes('heat')) {
    return {
      response: "Analyzed locations based on temperature data. Cooler areas (lower avgTemp) are better for datacenter cooling efficiency.",
      scenario: 'good'
    };
  }
  
  if (lowerMessage.includes('internet') || lowerMessage.includes('speed') || lowerMessage.includes('connectivity') || lowerMessage.includes('bandwidth')) {
    return {
      response: "Showing areas with high internet speeds and connectivity. Better connectivity means lower latency and higher throughput.",
      scenario: 'good'
    };
  }
  
  if (lowerMessage.includes('grid') || lowerMessage.includes('power') || lowerMessage.includes('electricity') || lowerMessage.includes('energy')) {
    return {
      response: "Displaying grid connectivity analysis. Areas closer to power infrastructure with more connections are more reliable.",
      scenario: 'good'
    };
  }
  
  if (lowerMessage.includes('opposition') || lowerMessage.includes('resistance') || lowerMessage.includes('approval')) {
    return {
      response: "Analyzed local opposition levels. Areas with low opposition are easier for regulatory approval and community acceptance.",
      scenario: 'good'
    };
  }
  
  if (lowerMessage.includes('worst') || lowerMessage.includes('bad') || lowerMessage.includes('avoid')) {
    return {
      response: "These locations should be avoided due to poor conditions: high temperatures, limited connectivity, distant power infrastructure, or high local opposition.",
      scenario: 'bad'
    };
  }
  
  if (lowerMessage.includes('all') || lowerMessage.includes('show') || lowerMessage.includes('display') || lowerMessage.includes('overview')) {
    return {
      response: "Comprehensive datacenter suitability analysis across France considering temperature, internet speed, grid proximity, and local opposition factors.",
      scenario: 'mixed'
    };
  }
  
  // Default response
  return {
    response: "Analyzed datacenter locations based on multiple factors including temperature, internet connectivity, power grid access, and local conditions.",
    scenario: 'mixed'
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();
    
    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid message format' },
        { status: 400 }
      );
    }
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
    
    const { response, scenario } = analyzeMessage(body.message);
    const { hexagonData, highlighted } = generateMockHexagonData(scenario);
    
    const responseData: AnalyzeResponse = {
      response,
      hexagonData,
      highlighted: highlighted.length > 0 ? highlighted : undefined
    };
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error in analyze API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}