import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, X, Send, Bot, User, Zap, Calendar, FileText, Star, TrendingUp, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logError, logInfo } from '@/lib/logger';

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  actions?: AgentAction[];
}

interface AgentAction {
  type: string;
  priority: string;
  data?: any;
}

interface AgentResponse {
  response: string;
  actions: AgentAction[];
  leadScore: number;
  suggestions: string[];
}

const RelevanceAgent = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: '¡Hola! Soy Sofia, experta en NAIQO y especialista en todas nuestras funcionalidades para salones de belleza 💅\n\nConozo al detalle nuestras 6 funcionalidades principales:\n• Análisis de Salud Ungueal con IA\n• Asistente Conversacional Inteligente\n• Recomendador Híbrido de Tratamientos\n• Gestión Inteligente de Citas\n• Predicción de Demanda de Inventario\n• Sistema de Privacidad Garantizada\n\n¿Sobre cuál de estas funcionalidades de NAIQO te gustaría saber más?',
      isBot: true,
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [leadScore, setLeadScore] = useState(0);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [visitorId] = useState(() => `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Detectar información del visitante
  useEffect(() => {
    const visitorInfo = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      referrer: document.referrer,
      timestamp: new Date().toISOString()
    };
    
    // Enviar info del visitante al backend
    logInfo('RelevanceAgent:visitorInfo', visitorInfo);
  }, []);

  const sendMessage = async (messageText?: string) => {
    const messageToSend = messageText || inputMessage.trim();
    if (!messageToSend || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageToSend,
      isBot: false,
      timestamp: new Date(),
    };

    setInputMessage('');
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('relevance-agent', {
        body: {
          message: messageToSend,
          sessionId: sessionId,
          visitorId: visitorId,
          visitorInfo: {
            userAgent: navigator.userAgent,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            referrer: document.referrer
          }
        },
      });

      logInfo('RelevanceAgent:response', { data, error });

      if (error) throw error;

      const agentResponse = data as AgentResponse;
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: agentResponse.response,
        isBot: true,
        timestamp: new Date(),
        actions: agentResponse.actions || []
      };

      setMessages(prev => [...prev, botMessage]);
      setLeadScore(agentResponse.leadScore || leadScore);
      setSuggestions(agentResponse.suggestions || []);
      
      // Mostrar notificaciones para acciones importantes
      if (agentResponse.actions?.some(action => action.priority === 'high')) {
        toast({
          title: "¡Lead caliente detectado!",
          description: "Excelente oportunidad para NAIQO identificada.",
        });
      }

    } catch (error) {
      logError('RelevanceAgent:sendMessage', error);
      toast({
        title: 'Error',
        description: 'No se pudo enviar el mensaje. Por favor, inténtalo de nuevo.',
        variant: 'destructive',
      });
      
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: 'Disculpa, hubo un problema técnico. Como alternativa, puedes contactar directamente a NAIQO: +34 900 123 456 o hola@naiqo.com para consultas sobre nuestros servicios de IA.',
        isBot: true,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };


  const getLeadScoreColor = (score: number) => {
    if (score < 25) return 'bg-gray-500';
    if (score < 50) return 'bg-yellow-500';
    if (score < 75) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getLeadScoreLabel = (score: number) => {
    if (score < 25) return 'Explorando';
    if (score < 50) return 'Interesado';
    if (score < 75) return 'Calificado';
    return '¡Oportunidad!';
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <div className="relative">
          <Button
            onClick={() => setIsOpen(true)}
            className="h-16 w-16 rounded-full bg-gradient-to-r from-primary via-purple-600 to-pink-600 hover:from-primary/90 hover:via-purple-600/90 hover:to-pink-600/90 shadow-xl animate-pulse"
            size="icon"
          >
            <div className="relative">
              <Zap className="h-7 w-7 text-white" />
              {leadScore > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 bg-red-500 text-xs">
                  {Math.floor(leadScore / 10)}
                </Badge>
              )}
            </div>
          </Button>
        </div>
      ) : (
        <Card className="w-96 h-[600px] flex flex-col shadow-2xl border-2 border-primary/20">
          <CardHeader className="bg-gradient-to-r from-primary via-purple-600 to-pink-600 text-white rounded-t-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Zap className="h-6 w-6" />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Sofia - IA Consultant</CardTitle>
                  <div className="text-xs opacity-90">NAIQO Expert Agent</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {leadScore > 0 && (
                  <div className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-1">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-xs font-medium">{leadScore}</span>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6 text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {leadScore > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>Lead Score</span>
                  <span className="font-bold">{getLeadScoreLabel(leadScore)}</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${getLeadScoreColor(leadScore)}`}
                    style={{ width: `${Math.min(leadScore, 100)}%` }}
                  ></div>
                </div>
              </div>
            )}
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Área de mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-96 min-h-0">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start gap-3 ${
                    message.isBot ? 'justify-start' : 'justify-end'
                  }`}
                >
                  {message.isBot && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                      message.isBot
                        ? 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 border border-gray-200'
                        : 'bg-gradient-to-r from-primary to-purple-600 text-white'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.text}</div>
                    {message.actions && message.actions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {message.actions.map((action, idx) => (
                          <Badge
                            key={idx}
                            variant={action.priority === 'high' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {action.type === 'schedule_demo' && <Calendar className="h-3 w-3 mr-1" />}
                            {action.type === 'generate_proposal' && <FileText className="h-3 w-3 mr-1" />}
                            {action.type === 'save_contact' && <Target className="h-3 w-3 mr-1" />}
                            {action.type.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {!message.isBot && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-400 to-gray-600 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
              
              {/* Indicador de escritura */}
              {isLoading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-purple-600 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-gray-100 p-3 rounded-2xl border border-gray-200">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-primary/70 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>


            {/* Input de mensaje */}
            <div className="border-t p-4 bg-white">
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Pregunta sobre los servicios de IA de NAIQO..."
                  disabled={isLoading}
                  className="flex-1 border-2 border-gray-200 focus:border-primary"
                  autoFocus
                />
                <Button
                  onClick={() => sendMessage()}
                  disabled={!inputMessage.trim() || isLoading}
                  size="icon"
                  className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              
              {suggestions.length > 0 && (
                <div className="mt-2 text-xs text-gray-600">
                  💡 Tip: {suggestions[0]}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RelevanceAgent;