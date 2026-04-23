import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  AlertTriangle,
  Volume2,
  Mic,
  MicOff,
  Sparkles,
  Clock,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logError } from '@/lib/logger';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  needsProfessional?: boolean;
  suggestedActions?: string[];
}

interface ConversationalAssistantProps {
  contextType?: string;
  relatedAnalysisId?: string;
  initialMessage?: string;
}

const ConversationalAssistant: React.FC<ConversationalAssistantProps> = ({
  contextType = 'general',
  relatedAnalysisId,
  initialMessage
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `¡Hola! Soy Sofia, tu asistente especializada en salud ungueal de NAIQO 💅

Puedo ayudarte con:
• Consultas sobre el cuidado de tus uñas
• Explicar resultados de análisis
• Recomendaciones personalizadas
• Prevención de problemas ungueales
• Consejos de tratamiento

¿En qué puedo ayudarte hoy?`,
      timestamp: new Date(),
    },
  ]);
  
  const [inputMessage, setInputMessage] = useState(initialMessage || '');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sessionId] = useState(() => `chat_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Text-to-Speech function
  const speakMessage = async (text: string) => {
    if ('speechSynthesis' in window) {
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      
      utterance.onend = () => {
        setIsSpeaking(false);
      };
      
      utterance.onerror = () => {
        setIsSpeaking(false);
      };
      
      speechSynthesis.speak(utterance);
    }
  };

  // Speech-to-Text function
  const startListening = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'es-ES';
      
      recognition.onstart = () => {
        setIsListening(true);
      };
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(transcript);
        setIsListening(false);
      };
      
      recognition.onerror = () => {
        setIsListening(false);
        toast({
          title: "Error de reconocimiento",
          description: "No se pudo procesar el audio. Intenta de nuevo.",
          variant: "destructive",
        });
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognition.start();
    } else {
      toast({
        title: "No compatible",
        description: "Tu navegador no soporta reconocimiento de voz",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async (messageText?: string) => {
    const messageToSend = messageText || inputMessage.trim();
    if (!messageToSend || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageToSend,
      timestamp: new Date(),
    };

    setInputMessage('');
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('conversational-assistant', {
        body: {
          message: messageToSend,
          conversationId: conversationId,
          sessionId: sessionId,
          contextType: contextType,
          relatedAnalysisId: relatedAnalysisId
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        needsProfessional: data.needsProfessional,
        suggestedActions: data.suggestedActions
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (!conversationId) {
        setConversationId(data.conversationId);
      }

      // Auto-read response if not too long
      if (data.response.length < 300) {
        setTimeout(() => speakMessage(data.response), 500);
      }

      if (data.needsProfessional) {
        toast({
          title: "Consulta profesional recomendada",
          description: "La asistente sugiere consultar con un especialista",
        });
      }

    } catch (error) {
      logError('ConversationalAssistant:sendMessage', error);
      toast({
        title: 'Error',
        description: 'No se pudo enviar el mensaje. Por favor, inténtalo de nuevo.',
        variant: 'destructive',
      });
      
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: 'Disculpa, estoy teniendo problemas técnicos en este momento. Como asistente especializada de NAIQO, puedo ayudarte con consultas sobre salud ungueal. ¿Podrías intentar hacer tu pregunta nuevamente?',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedQuestions = [
    "¿Cómo puedo fortalecer mis uñas?",
    "¿Cuáles son los síntomas de hongos en las uñas?",
    "¿Con qué frecuencia debo cortar mis uñas?",
    "¿Qué productos naturales recomiendas?",
    "¿Cuándo debo consultar a un dermatólogo?"
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="h-[600px] flex flex-col shadow-2xl border-2 border-primary/20">
        <CardHeader className="bg-gradient-primary text-white rounded-t-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Sparkles className="h-6 w-6" />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Sofia - Asistente Especializada</CardTitle>
                <div className="text-sm opacity-90">Experta en Salud Ungueal NAIQO</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {contextType !== 'general' && (
                <Badge variant="secondary" className="bg-white/20 text-white">
                  {contextType === 'analysis_result' ? 'Post-Análisis' : contextType}
                </Badge>
              )}
              {isSpeaking && (
                <div className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-1">
                  <Volume2 className="h-3 w-3 animate-pulse" />
                  <span className="text-xs">Hablando</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-0">
          {/* Área de mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-96 min-h-0">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${
                  message.role === 'assistant' ? 'justify-start' : 'justify-end'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                
                <div
                  className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    message.role === 'assistant'
                      ? 'bg-gradient-card text-foreground border border-border'
                      : 'bg-gradient-primary text-white'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  
                  {/* Professional attention alert */}
                  {message.needsProfessional && (
                    <Alert className="mt-3 border-orange-200 bg-orange-50">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800 text-xs">
                        Se recomienda consulta profesional
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {/* Suggested actions */}
                  {message.suggestedActions && message.suggestedActions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {message.suggestedActions.map((action, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-xs cursor-pointer hover:bg-primary/10"
                          onClick={() => setInputMessage(action)}
                        >
                          {action}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {/* Timestamp and actions */}
                  <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                    {message.role === 'assistant' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 hover:bg-white/20"
                        onClick={() => speakMessage(message.content)}
                        disabled={isSpeaking}
                      >
                        <Volume2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-400 to-gray-600 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ))}
            
            {/* Indicador de escritura */}
            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-gradient-card p-3 rounded-2xl border border-border">
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

          {/* Preguntas sugeridas */}
          {messages.length === 1 && (
            <div className="px-4 py-2 border-t bg-gradient-card">
              <p className="text-sm text-muted-foreground mb-2">Preguntas frecuentes:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => sendMessage(question)}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          )}

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
                placeholder="Pregunta sobre salud ungueal, cuidados, análisis..."
                disabled={isLoading}
                className="flex-1 border-2 border-border focus:border-primary"
              />
              
              {/* Botón de voz */}
              <Button
                onClick={startListening}
                disabled={isLoading || isListening}
                size="icon"
                variant="outline"
                className={`${isListening ? 'bg-red-100 border-red-300' : ''}`}
              >
                {isListening ? (
                  <MicOff className="h-4 w-4 text-red-600" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
              
              {/* Botón de envío */}
              <Button
                onClick={() => sendMessage()}
                disabled={!inputMessage.trim() || isLoading}
                size="icon"
                className="bg-gradient-primary text-white hover:shadow-brand"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConversationalAssistant;