import { NextRequest, NextResponse } from 'next/server';

// Backend API types
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
  additional_context?: string;
  highlighted?: Record<string, number>;
};

type HexagonDataItem = {
  score: number;
  connection_points?: number;
  latency_ms?: number;
  avg_temperature?: number;
  connection_normalized_score?: number;
  latency_normalized_score?: number;
  temperature_normalized_score?: number;
  opposition?: "low" | "medium" | "high";
};

type InformationResponse = {
  response: string;
  hexagonData?: Record<string, HexagonDataItem>;
  highlighted?: Record<string, number>;
};

// Frontend types
type ResearchRequest = {
  message: string;
  previousMessage?: string;
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
    connection_points?: number;
    latency_ms?: number;
    avg_temperature?: number;
    connection_normalized_score?: number;
    latency_normalized_score?: number;
    temperature_normalized_score?: number;
    opposition?: "low" | "medium" | "high";
  };
};

type ResearchResponse = {
  response: string;
  hexagonData: HexagonData;
  highlighted?: string[];
};

// API configuration
const API_BASE_URL = process.env.BACKEND_API_URL || 'http://localhost:8000';

async function callBackendResearchAPI(message: string, previousMessage?: string): Promise<InformationResponse> {
  const requestBody: InformationRequest = {
    message,
    additional_context: previousMessage || undefined,
    highlighted: {} // Can be populated with current highlighted hexagons if needed
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
    console.error('Error calling backend research API:', error);
    throw error;
  }
}

// Fallback function for when backend is unavailable
function generateResearchFallback(message: string): ResearchResponse {
  const lowerMessage = message.toLowerCase();
  
  let response: string;
  if (lowerMessage.includes('legislation') || lowerMessage.includes('legal')) {
    response = `## 📋 Legal & Regulatory Information

**Regulatory landscape** for datacenter deployment in France.

### 🏛️ Key Legislation:
- **GDPR Compliance** - EU data protection requirements
- **French Data Protection Act** - National privacy laws
- **Environmental regulations** - Carbon footprint requirements
- **Planning permissions** - Local authority approvals

### ⚖️ Compliance Requirements:
- **Data residency** obligations
- **Environmental impact** assessments
- **Energy efficiency** standards
- **Local zoning** restrictions

*Always consult with legal experts for specific requirements.*`;
  } else if (lowerMessage.includes('opposition') || lowerMessage.includes('community')) {
    response = `## 👥 Community & Opposition Analysis

**Social acceptance** factors for datacenter projects.

### 🏘️ Community Concerns:
- **Environmental impact** - Noise, heat, visual pollution
- **Energy consumption** - Local grid capacity concerns
- **Traffic increase** - Construction and maintenance vehicles
- **Property values** - Potential impact on local real estate

### 🤝 Mitigation Strategies:
- **Community engagement** - Early stakeholder consultation
- **Environmental benefits** - Highlight green energy usage
- **Local employment** - Job creation opportunities
- **Infrastructure investment** - Grid and road improvements

### 📊 Opposition Levels:
- **Low**: Rural areas with economic incentives
- **Medium**: Suburban areas with mixed opinions
- **High**: Urban centers with environmental concerns`;
  } else {
    response = `## 🔍 Research Information

**Comprehensive analysis** of datacenter deployment factors.

### 📚 Key Research Areas:
- **🏛️ Legal Framework**: Compliance and regulatory requirements
- **👥 Social Impact**: Community acceptance and opposition
- **🌍 Environmental**: Sustainability and climate considerations
- **💼 Economic**: Investment incentives and tax implications

### 📖 Available Information:
- **Regulatory compliance** guidelines
- **Environmental impact** assessments
- **Community engagement** strategies
- **Economic feasibility** studies

*Ask specific questions about legislation, opposition, or environmental factors for detailed analysis.*`;
  }

  // Generate sample research data
  const sampleHexagonData = {
    '871fb4662ffffff': {
      score: 0.6,
      connection_points: 3,
      latency_ms: 25,
      avg_temperature: 15.5,
      connection_normalized_score: 0.6,
      latency_normalized_score: 0.5,
      temperature_normalized_score: 0.6,
      opposition: 'medium' as const
    },
    '871f90209ffffff': {
      score: 0.8,
      connection_points: 4,
      latency_ms: 18,
      avg_temperature: 12.2,
      connection_normalized_score: 0.8,
      latency_normalized_score: 0.75,
      temperature_normalized_score: 0.8,
      opposition: 'low' as const
    }
  };

  return {
    response,
    hexagonData: sampleHexagonData,
    highlighted: ['871fb4662ffffff']
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: ResearchRequest = await request.json();
    
    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid message format' },
        { status: 400 }
      );
    }

    try {
      // Try to call the backend research API first
      const backendResponse = await callBackendResearchAPI(body.message, body.previousMessage);
      
      // Transform backend response to frontend format
      const responseData: ResearchResponse = {
        response: backendResponse.response,
        hexagonData: backendResponse.hexagonData || {},
        highlighted: backendResponse.highlighted ? Object.keys(backendResponse.highlighted) : undefined
      };
      
      return NextResponse.json(responseData);
    } catch (apiError) {
      console.warn('Backend research API unavailable, using fallback response:', apiError);
      
      // Use fallback response when backend is unavailable
      const fallbackResponse = generateResearchFallback(body.message);
      return NextResponse.json(fallbackResponse);
    }
  } catch (error) {
    console.error('Error in research API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 