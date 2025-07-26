'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, MapPin, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Message = {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
};

type HexagonData = {
  [h3Index: string]: {
    score: number;
    avgTemp?: number;
    gridDistance?: number;
    [key: string]: any;
  };
};

type AnalyzeResponse = {
  response: string;
  hexagonData: HexagonData;
};

interface ChatProps {
  onMapUpdate: (hexagonData: HexagonData) => void;
}

const SAMPLE_QUERIES = [
  "Show me the best locations",
  "Find areas with low temperature", 
  "Where are the closest grid connections?"
];

export default function Chat({ onMapUpdate }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (type: 'user' | 'bot', content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSendMessage = async (message?: string) => {
    const messageToSend = message || inputValue.trim();
    if (!messageToSend || isLoading) return;

    setInputValue('');
    addMessage('user', messageToSend);
    setIsLoading(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: messageToSend }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AnalyzeResponse = await response.json();
      
      addMessage('bot', data.response);
      
      if (data.hexagonData && Object.keys(data.hexagonData).length > 0) {
        onMapUpdate(data.hexagonData);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage('bot', 'Sorry, I encountered an error processing your request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="flex flex-col h-full border-0 rounded-none shadow-none">
      {/* Chat header */}
      <CardHeader className="border-b bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Datacenter Analysis</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Ask about locations, temperature, or grid connections</p>
          </div>
        </div>
      </CardHeader>

      {/* Messages area */}
      <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <div className="space-y-3">
              <div className="p-4 bg-primary/5 rounded-full w-fit mx-auto">
                <MapPin className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Welcome!</h3>
              <p className="text-muted-foreground">
                Ask me about datacenter locations across France
              </p>
            </div>
            
            <div className="space-y-3 w-full max-w-sm">
              <p className="text-sm font-medium text-muted-foreground">Try asking:</p>
              {SAMPLE_QUERIES.map((query, index) => (
                <button
                  key={index}
                  className="w-full text-left p-3 text-sm border border-border bg-background hover:bg-accent hover:text-accent-foreground rounded-lg transition-all duration-200 hover:shadow-sm"
                  onClick={() => handleSendMessage(query)}
                  disabled={isLoading}
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex w-full ${
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 text-sm shadow-sm ${
                    message.type === 'user'
                      ? 'bg-primary text-primary-foreground ml-8'
                      : 'bg-muted/50 text-foreground mr-8 border border-border/50'
                  }`}
                >
                  <p className="leading-relaxed">{message.content}</p>
                  <p className={`text-xs mt-2 opacity-60 ${
                    message.type === 'user' ? 'text-primary-foreground' : 'text-muted-foreground'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted/50 rounded-xl px-4 py-3 border border-border/50 mr-8">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-foreground">Analyzing locations...</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      {/* Input area */}
      <div className="border-t border-border p-6 bg-background/50">
        <div className="flex gap-3">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about datacenter locations..."
            disabled={isLoading}
            className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isLoading}
            className="inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md active:scale-95 h-11 w-11"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}