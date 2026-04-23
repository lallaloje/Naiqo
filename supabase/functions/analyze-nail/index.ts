import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema - only allow Supabase storage URLs to prevent SSRF
const AnalysisRequestSchema = z.object({
  imageUrl: z.string()
    .url({ message: "Invalid URL format" })
    .refine(
      (url) => url.includes('.supabase.co/storage/v1/object/') && url.includes('/nail-images/'),
      { message: "Only Supabase storage URLs for nail-images bucket are allowed" }
    ),
  sessionId: z.string()
    .regex(/^[a-zA-Z0-9_-]{1,100}$/, { message: "Invalid session ID format" })
    .optional(),
  userId: z.string()
    .uuid({ message: "Invalid user ID format" })
    .optional()
});

interface NailCondition {
  id: string;
  name: string;
  category: string;
  short_definition: string;
  clinical_signs: string;
  differential_diagnosis: string[];
  recommended_tests: string[];
  treatment_summary: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate input
    const rawInput = await req.json();
    const validationResult = AnalysisRequestSchema.safeParse(rawInput);
    
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error.errors);
      return new Response(JSON.stringify({ 
        error: 'Invalid input', 
        details: validationResult.error.errors.map(e => e.message).join(', ')
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { imageUrl, sessionId, userId } = validationResult.data;

    console.log('Iniciando análisis de salud ungueal:', { imageUrl, sessionId, userId });

    // Crear registro inicial de análisis
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
      console.error('Error creando registro de análisis:', insertError);
      throw new Error('Error al crear registro de análisis');
    }

    console.log('Registro de análisis creado:', analysisRecord.id);

    // Extraer el path de storage de la URL con validación
    const urlParts = imageUrl.split('/nail-images/');
    if (urlParts.length !== 2 || !urlParts[1]) {
      throw new Error('URL de imagen inválida');
    }
    const storagePath = urlParts[1];
    
    // Validate storage path doesn't contain path traversal
    if (storagePath.includes('..') || storagePath.includes('//')) {
      throw new Error('Invalid storage path');
    }

    // Descargar la imagen desde Supabase Storage usando credenciales de servicio
    console.log('Descargando imagen desde storage:', storagePath);
    const { data: imageData, error: downloadError } = await supabase
      .storage
      .from('nail-images')
      .download(storagePath);

    if (downloadError || !imageData) {
      console.error('Error descargando imagen:', downloadError);
      throw new Error('Error descargando imagen desde storage');
    }

    // Convertir blob a base64 de forma segura
    const imageBuffer = await imageData.arrayBuffer();
    const uint8Array = new Uint8Array(imageBuffer);
    
    // Convertir en chunks para evitar stack overflow
    let base64Image = '';
    const chunkSize = 0x8000; // 32KB chunks
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize);
      base64Image += String.fromCharCode.apply(null, Array.from(chunk));
    }
    base64Image = btoa(base64Image);
    
    const mimeType = imageData.type || 'image/jpeg';
    console.log('Imagen convertida a base64, tamaño:', base64Image.length);

    // Obtener condiciones conocidas de la base de datos
    const { data: conditions, error: conditionsError } = await supabase
      .from('nail_conditions')
      .select('*');

    if (conditionsError) {
      console.error('Error obteniendo condiciones:', conditionsError);
    }

    const conditionsContext = conditions?.map((c: NailCondition) => 
      `${c.name} (${c.category}): ${c.short_definition}. Signos clínicos: ${c.clinical_signs || 'No especificado'}.`
    ).join('\n') || '';

    // Analizar imagen con Lovable AI (Gemini)
    const analysisPrompt = `Eres un especialista en dermatología y salud ungueal. Analiza esta imagen de uñas y proporciona un diagnóstico detallado.

CONDICIONES CONOCIDAS:
${conditionsContext}

Analiza la imagen y responde en formato JSON con:
{
  "detected_issues": ["lista de problemas detectados"],
  "severity_score": número del 0-100,
  "confidence_score": número del 0.00-1.00,
  "detailed_analysis": "análisis detallado de lo observado",
  "recommendations": ["lista de recomendaciones específicas"],
  "requires_medical_attention": boolean,
  "summary": "resumen breve del estado de las uñas"
}

IMPORTANTE:
- Sé específico sobre lo que observas
- Incluye recomendaciones prácticas
- Si detectas algo grave, marca requires_medical_attention como true
- El severity_score debe reflejar la gravedad (0=perfecto, 100=muy grave)
- Confidence_score debe reflejar qué tan seguro estás del análisis`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: analysisPrompt + '\n\nAnaliza esta imagen de uñas siguiendo las instrucciones.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Error de Lovable AI:', errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Límite de peticiones excedido. Por favor, intenta de nuevo en unos momentos.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Fondos insuficientes. Por favor, añade créditos a tu workspace de Lovable AI.');
      }
      
      throw new Error(`Error del análisis de IA: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const analysisText = aiResult.choices[0].message.content;
    
    console.log('Respuesta de OpenAI:', analysisText);

    // Parsear respuesta JSON
    let analysisData;
    try {
      // Limpiar la respuesta si viene envuelta en markdown
      const cleanText = analysisText.replace(/```json\n?|\n?```/g, '').trim();
      analysisData = JSON.parse(cleanText);
    } catch (parseError) {
      console.error('Error parseando JSON:', parseError);
      console.log('Texto original:', analysisText);
      
      // Fallback: crear análisis básico
      analysisData = {
        detected_issues: ['Análisis completado'],
        severity_score: 50,
        confidence_score: 0.70,
        detailed_analysis: analysisText,
        recommendations: ['Consultar con un especialista para evaluación detallada'],
        requires_medical_attention: false,
        summary: 'Análisis disponible en detalle'
      };
    }

    // Actualizar registro con resultados
    const { error: updateError } = await supabase
      .from('nail_analysis')
      .update({
        analysis_results: analysisData,
        detected_issues: analysisData.detected_issues || [],
        severity_score: analysisData.severity_score || 50,
        confidence_score: analysisData.confidence_score || 0.70,
        recommendations: analysisData.recommendations || [],
        analysis_status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', analysisRecord.id);

    if (updateError) {
      console.error('Error actualizando análisis:', updateError);
      throw new Error('Error al guardar resultados del análisis');
    }

    console.log('Análisis completado exitosamente:', analysisRecord.id);

    // Retornar resultado completo
    const finalResult = {
      analysisId: analysisRecord.id,
      ...analysisData,
      imageUrl: imageUrl,
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(finalResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error en análisis de salud ungueal:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Error desconocido en el análisis',
      details: 'Por favor, verifica que la imagen sea clara y muestre las uñas claramente.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});