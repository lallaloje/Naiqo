import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, sessionId, userId } = await req.json();

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'imageUrl es requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Crear registro inicial
    const { data: analysisRecord, error: insertError } = await supabase
      .from('nail_analysis')
      .insert({
        image_url: imageUrl,
        session_id: sessionId,
        user_id: userId,
        analysis_status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creando registro:', insertError);
      throw new Error('Error al crear registro de análisis');
    }

    // Descargar imagen desde Supabase Storage
    const urlParts = imageUrl.split('/nail-images/');
    if (urlParts.length !== 2) throw new Error('URL de imagen inválida');
    const storagePath = urlParts[1];

    const { data: imageData, error: downloadError } = await supabase.storage
      .from('nail-images')
      .download(storagePath);

    if (downloadError || !imageData) {
      throw new Error('Error descargando imagen desde storage');
    }

    // Convertir a base64
    const imageBuffer = await imageData.arrayBuffer();
    const uint8Array = new Uint8Array(imageBuffer);
    let base64Image = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize);
      base64Image += String.fromCharCode.apply(null, Array.from(chunk));
    }
    base64Image = btoa(base64Image);
    const mimeType = imageData.type || 'image/jpeg';

    // Analizar con Claude
    const prompt = `Eres una especialista en estética, salud ungueal y colorimetría personal con años de experiencia en centros de uñas profesionales.

Analiza esta imagen de uñas y proporciona un diagnóstico completo que incluye salud ungueal Y análisis de colorimetría personalizada.

Responde ÚNICAMENTE en formato JSON con esta estructura exacta:
{
  "detected_issues": ["lista de problemas o condiciones detectadas, o ['Uñas saludables'] si están bien"],
  "severity_score": número del 0 al 100 (0=perfectas, 100=muy graves),
  "confidence_score": número del 0.00 al 1.00,
  "detailed_analysis": "análisis detallado de lo que observas: color, textura, forma, hidratación, cutículas, etc.",
  "recommendations": ["lista de recomendaciones específicas para la profesional o la clienta"],
  "requires_medical_attention": true o false,
  "summary": "resumen breve en 1-2 frases del estado general de las uñas",
  "colorimetria": {
    "tono_piel": "descripción del tono de piel detectado (ej: piel clara con subtono frío, piel media con subtono cálido, piel oscura con subtono neutro, etc.)",
    "subtono": "frío | cálido | neutro",
    "forma_uña": "descripción de la forma natural de la uña (ej: ovalada, cuadrada, redonda, almendra, puntiaguda, en pala)",
    "colores_recomendados": ["lista de 5-7 colores de esmalte específicos que mejor favorecen a este tono de piel y forma de uña, con nombre del color y por qué favorece"],
    "colores_evitar": ["lista de 2-3 colores que no favorecen y por qué"],
    "acabados_recomendados": ["brillante | mate | satinado | glitter — cuáles favorecen más y por qué"],
    "estilos_uña_recomendados": ["2-3 estilos de uña (forma + longitud) que mejor favorecen según la mano detectada"],
    "consejo_profesional": "consejo personalizado de colorimetría para esta clienta en 1-2 frases"
  }
}

Sé específica y práctica. Si las uñas están sanas, indícalo claramente con un severity_score bajo. Para la colorimetría, basa tus recomendaciones en lo que puedas observar de la piel de la mano en la imagen.`;

    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5-5',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Error de Anthropic:', errorText);
      throw new Error(`Error del análisis de IA: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const analysisText = aiResult.content[0].text;

    // Parsear respuesta JSON — extraer el objeto JSON aunque venga envuelto en markdown
    let analysisData;
    // Extraer el objeto JSON de la respuesta, ignorando texto extra antes/después
    const extractJson = (text: string) => {
      // Quitar bloques de código markdown
      const stripped = text.replace(/```(?:json)?\s*/gi, '').trim();
      // Buscar el bloque JSON más grande (desde el primer { hasta el último })
      const start = stripped.indexOf('{');
      const end = stripped.lastIndexOf('}');
      if (start !== -1 && end > start) {
        return stripped.slice(start, end + 1);
      }
      return stripped;
    };
    try {
      analysisData = JSON.parse(extractJson(analysisText));
    } catch {
      // Segundo intento: regex por si extractJson no funcionó
      try {
        const m = analysisText.match(/\{[\s\S]*\}/);
        if (m) analysisData = JSON.parse(m[0]);
        else throw new Error('no json');
      } catch {
        analysisData = {
          detected_issues: ['Análisis completado'],
          severity_score: 30,
          confidence_score: 0.70,
          detailed_analysis: 'No se pudo procesar el análisis. Por favor, intenta de nuevo.',
          recommendations: ['Consultar con la especialista para evaluación detallada'],
          requires_medical_attention: false,
          summary: 'Análisis disponible en detalle'
        };
      }
    }

    // Guardar resultados
    await supabase
      .from('nail_analysis')
      .update({
        analysis_results: analysisData,
        detected_issues: analysisData.detected_issues || [],
        severity_score: analysisData.severity_score || 30,
        confidence_score: analysisData.confidence_score || 0.70,
        recommendations: analysisData.recommendations || [],
        analysis_status: 'completed',
      })
      .eq('id', analysisRecord.id);

    return new Response(JSON.stringify({
      analysisId: analysisRecord.id,
      ...analysisData,
      imageUrl,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error en análisis:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Error desconocido',
      details: 'Por favor, verifica que la imagen sea clara y muestre las uñas claramente.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
