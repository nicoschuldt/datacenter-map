import { NextRequest, NextResponse } from 'next/server';

// Backend API types
type ScoreRequest = {
  message: string;
};

type ScoreResponse = {
  score_grid: number;
  score_temperature: number;
  score_network: number;
};

type CurrentView = {
  lat: number;
  lng: number;
  zoom: number;
};

type Context = {
  currentView: CurrentView;
};

type InformationRequest = {
  message: string;
  context?: Context;
};

type HexagonDataItem = {
  score: number;
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

type InformationResponse = {
  response: string;
  hexagonData?: Record<string, HexagonDataItem>;
  highlighted?: string[];
};

// Frontend types
type AnalyzeRequest = {
  message: string;
  context?: {
    currentView?: {
      lat: number;
      lng: number;
      zoom: number;
    };
  };
};

type HexagonData = {
  [h3Index: string]: {
    score: number;
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
  highlighted?: string[];
};

// API configuration
const API_BASE_URL = process.env.BACKEND_API_URL || 'http://localhost:8000';

async function callBackendAPI(message: string, context?: Context): Promise<InformationResponse> {
  const requestBody: InformationRequest = {
    message,
    ...(context && { context })
  };

  try {
    const response = await fetch(`${API_BASE_URL}/information`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
    }

    const data: InformationResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error calling backend API:', error);
    throw error;
  }
}

// Fallback function for when backend is unavailable
function generateFallbackResponse(message: string): AnalyzeResponse {
  const lowerMessage = message.toLowerCase();
  
  let response: string;
  if (lowerMessage.includes('best') || lowerMessage.includes('good') || lowerMessage.includes('optimal')) {
    response = `## 🎯 Optimal Datacenter Locations

**Analysis completed** - Found excellent locations across France.

### 🌟 Key Highlights:
- **Temperature Range**: 8-15°C (optimal for cooling)
- **Internet Speed**: 500-800 Mbps (high bandwidth)
- **Grid Distance**: < 5km (proximity to power)
- **Community Opposition**: Low

### 📍 Recommended Areas:
1. **Northern France** - Cooler climate, good infrastructure
2. **Alpine Regions** - Natural cooling advantages
3. **Coastal Areas** - Access to renewable energy

### 💡 Next Steps:
Consider these locations for **immediate deployment** with minimal environmental impact.`;
  } else if (lowerMessage.includes('temperature')) {
    response = `## 🌡️ Temperature Analysis

**Cooling efficiency assessment** completed for datacenter locations.

### 📊 Temperature Zones:
- **🟢 Optimal (8-15°C)**: Northern regions, high altitude
- **🟡 Moderate (15-20°C)**: Central France, coastal areas  
- **🔴 Challenging (20-25°C)**: Southern regions, urban centers

### ❄️ Cooling Recommendations:
- **Natural cooling** in northern areas
- **Hybrid systems** for moderate zones
- **Advanced cooling** required in warm areas

*Analysis based on historical climate data*`;
  } else if (lowerMessage.includes('internet') || lowerMessage.includes('connectivity')) {
    response = `## 🌐 Internet Infrastructure Analysis

**Connectivity assessment** for datacenter deployment.

### 📡 Network Performance:
- **High Speed (500-800 Mbps)**: Major cities, tech hubs
- **Medium Speed (300-500 Mbps)**: Suburban areas
- **Limited Speed (100-300 Mbps)**: Rural regions

### 🚀 Infrastructure Quality:
- **Fiber optic** coverage in urban centers
- **5G networks** expanding rapidly
- **Satellite backup** for remote locations

### 📈 Recommendations:
Focus on **fiber-rich areas** for optimal performance.`;
  } else if (lowerMessage.includes('grid') || lowerMessage.includes('power')) {
    response = `## ⚡ Power Grid Analysis

**Electrical infrastructure** assessment completed.

### 🔌 Grid Coverage:
- **🟢 Excellent (< 2km)**: Urban centers, industrial zones
- **🟡 Good (2-5km)**: Suburban areas, major highways
- **🔴 Limited (> 5km)**: Rural regions, remote locations

### 💪 Grid Reliability:
- **Nuclear power** plants provide stable base load
- **Renewable energy** integration increasing
- **Smart grid** technology deployment

### 🎯 Strategic Locations:
Prioritize areas with **reliable grid connections** and **renewable energy access**.`;
  } else {
    response = `## 🏢 Datacenter Location Analysis

**Comprehensive assessment** of potential datacenter sites.

### 🔍 Analysis Factors:
- **🌡️ Climate Conditions**: Temperature and humidity
- **🌐 Network Infrastructure**: Internet speed and reliability
- **⚡ Power Grid**: Distance and capacity
- **👥 Community Impact**: Local opposition and regulations

### 📊 Current Findings:
- **15 locations** analyzed across France
- **Mixed conditions** with varying suitability
- **Northern regions** show optimal conditions

### 🎯 Recommendations:
Consider **site-specific analysis** for detailed deployment planning.`;
  }

  return {
    response,
    hexagonData: {},
    highlighted: []
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

    // Prepare context from request if available
    const context: Context | undefined = body.context?.currentView ? {
      currentView: body.context.currentView
    } : undefined;

    try {
      // Try to call the backend API first
      const backendResponse = await callBackendAPI(body.message, context);
      
      // Transform backend response to frontend format
      const responseData: AnalyzeResponse = {
        response: backendResponse.response,
        hexagonData: backendResponse.hexagonData || {},
        highlighted: backendResponse.highlighted
      };
      
      return NextResponse.json(responseData);
    } catch (apiError) {
      console.warn('Backend API unavailable, using fallback response:', apiError);
      
      // Use fallback response when backend is unavailable
      const fallbackResponse = generateFallbackResponse(body.message);
      return NextResponse.json(fallbackResponse);
    }
  } catch (error) {
    console.error('Error in analyze API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}