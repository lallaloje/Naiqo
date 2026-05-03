import React from 'react';

const RELEVANCE_URL = "https://app.relevanceai.com/agents/d7b62b/cfa356af-ce01-43c2-9b72-3108989f04d1/b57fb9a8-8f82-4932-80fd-2c44337080e2/embed-chat?starting_message_prompts=%C2%BFEn+que+me+puedes+ayudar%3F&starting_message_prompts=%C2%BFC%C3%B3mo+puedo+programar+una+cita%3F&starting_message_prompts=Expl%C3%ADcame+como+funciona+el+an%C3%A1lisis+de+salud+ungueal&hide_tool_steps=true&hide_file_uploads=true&hide_conversation_list=true&bubble_style=agent&primary_color=%23FF1F8E&bubble_icon=pd%2Fchat&input_placeholder_text=Escribe+tu+consulta&hide_logo=true&hide_description=false";

interface ConversationalAssistantProps {
  contextType?: string;
  relatedAnalysisId?: string;
  initialMessage?: string;
}

const ConversationalAssistant: React.FC<ConversationalAssistantProps> = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="rounded-2xl overflow-hidden shadow-2xl border-2 border-primary/20" style={{ height: '700px' }}>
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-5 py-4 flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">
              💅
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight">Sofia — Asistente Especializada</p>
            <p className="text-pink-100 text-xs">Experta en Salud Ungueal · NAIQO</p>
          </div>
          <div className="ml-auto">
            <span className="text-xs bg-white/20 text-white px-2 py-1 rounded-full">● En línea</span>
          </div>
        </div>

        {/* Relevance iframe */}
        <iframe
          src={RELEVANCE_URL}
          style={{ width: '100%', height: 'calc(100% - 72px)', border: 'none' }}
          allow="microphone"
          title="Sofia - Asistente NAIQO"
        />
      </div>
    </div>
  );
};

export default ConversationalAssistant;
