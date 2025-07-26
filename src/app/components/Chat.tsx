'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, MapPin, Loader2, Sparkles, Bot, User, Copy, ThumbsUp, ThumbsDown, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Message = {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  isMarkdown?: boolean;
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

  const addMessage = (type: 'user' | 'bot', content: string, isMarkdown = false) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
      isMarkdown
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
      // TODO: Get current map view for context
      const requestBody = {
        message: messageToSend,
        // context: {
        //   currentView: {
        //     lat: currentLat,
        //     lng: currentLng,
        //     zoom: currentZoom
        //   }
        // }
      };

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AnalyzeResponse = await response.json();
      
      addMessage('bot', data.response, true);
      
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
    <div className="flex flex-col h-full bg-gradient-to-br from-[#18181b] to-[#23232a] border-l border-slate-800">
      {/* Chat header */}
      <div className="p-6 border-b border-slate-800 bg-[#23232a]">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#18181b] rounded-xl border border-slate-800">
            <Sparkles className="h-6 w-6 text-slate-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-200">Datacenter AI</h2>
            <p className="text-sm text-slate-400 mt-1">Intelligent location analysis with 3D mapping</p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-8">
            <div className="space-y-4">
              <div className="p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl border border-blue-500/20 w-fit mx-auto">
                <Sparkles className="h-12 w-12 text-blue-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Welcome to Datacenter AI
                </h3>
                <p className="text-slate-400 text-lg">
                  Discover optimal datacenter locations with AI-powered analysis
                </p>
              </div>
            </div>
            
            <div className="space-y-4 w-full max-w-md">
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Try asking:</p>
              {SAMPLE_QUERIES.map((query, index) => (
                <button
                  key={index}
                  className="w-full text-left p-4 text-sm border border-slate-700/50 bg-slate-800/50 hover:bg-slate-700/50 hover:border-slate-600/50 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 group"
                  onClick={() => handleSendMessage(query)}
                  disabled={isLoading}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-slate-700/50 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                      <MapPin className="h-4 w-4 text-slate-400 group-hover:text-blue-400" />
                    </div>
                    <span className="text-slate-300 group-hover:text-white transition-colors">{query}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex w-full message-enter ${
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                   <div
                     className={`rounded-2xl px-5 py-4 text-sm ${
                       message.type === 'user'
                         ? 'bg-[#23232a] text-slate-200 border border-slate-800 shadow-lg'
                         : 'bg-[#18181b] text-slate-200 border border-slate-800 shadow-lg'
                     }`}
                   >
                     {message.isMarkdown ? (
                       <div className="markdown-content">
                         <ReactMarkdown remarkPlugins={[remarkGfm]}>
                           {message.content}
                         </ReactMarkdown>
                       </div>
                     ) : (
                       <p className="leading-relaxed">{message.content}</p>
                     )}
                     
                     <div className={`flex items-center justify-between mt-3 pt-3 border-t ${
                       message.type === 'user' 
                         ? 'border-white/20' 
                         : 'border-slate-800'
                     }`}>
                       <p className={`text-xs opacity-60 ${
                         message.type === 'user' ? 'text-white/80' : 'text-slate-500'
                       }`}>
                         {message.timestamp.toLocaleTimeString([], { 
                           hour: '2-digit', 
                           minute: '2-digit' 
                         })}
                       </p>
                       
                       {message.type === 'bot' && (
                         <div className="flex items-center gap-1">
                           <button className="p-1.5 hover:bg-slate-700/50 rounded-lg transition-colors">
                             <ThumbsUp className="h-3 w-3 text-slate-400 hover:text-green-400" />
                           </button>
                           <button className="p-1.5 hover:bg-slate-700/50 rounded-lg transition-colors">
                             <ThumbsDown className="h-3 w-3 text-slate-400 hover:text-red-400" />
                           </button>
                           <button className="p-1.5 hover:bg-slate-700/50 rounded-lg transition-colors">
                             <Copy className="h-3 w-3 text-slate-400 hover:text-blue-400" />
                           </button>
                           <button className="p-1.5 hover:bg-slate-700/50 rounded-lg transition-colors">
                             <RotateCcw className="h-3 w-3 text-slate-400 hover:text-purple-400" />
                           </button>
                         </div>
                       )}
                     </div>
                   </div>
                 </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start message-enter">
                <div className="flex items-start gap-3 max-w-[85%]">
                  <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg border border-blue-500/30 flex-shrink-0 mt-1">
                    <Bot className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl px-5 py-4 border border-slate-700/50 shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                      <span className="text-sm text-slate-300">Analyzing datacenter locations...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-slate-800 p-6 bg-[#18181b]">
        <div className="flex gap-3">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about datacenter locations..."
            disabled={isLoading}
            className="flex h-12 w-full rounded-xl border border-slate-800 bg-[#23232a] px-4 py-3 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 focus-visible:ring-offset-2 focus-visible:ring-offset-[#18181b] disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 text-slate-200"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isLoading}
            className="inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 focus-visible:ring-offset-2 focus-visible:ring-offset-[#18181b] disabled:pointer-events-none disabled:opacity-50 bg-[#23232a] text-slate-200 border border-slate-800 hover:bg-[#23232a]/80 hover:shadow active:scale-95 h-12 w-12"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}