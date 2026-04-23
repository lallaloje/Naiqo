import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  Target, 
  Clock, 
  Euro, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  Lightbulb,
  Heart,
  RefreshCw
} from "lucide-react";
import { logError } from '@/lib/logger';

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  price: number;
  duration_minutes: number;
  benefits: string[];
}

interface RecommendedProduct {
  productId: string;
  productName: string;
  priority: number;
  reasoning: string;
  expectedResults: string;
  urgency: 'alta' | 'media' | 'baja';
  product: Product;
}

interface Recommendations {
  recommendedProducts: RecommendedProduct[];
  overallRecommendation: string;
  estimatedTotalCost: number;
  estimatedTotalDuration: number;
  followUpAdvice: string;
  preventionTips: string[];
  recommendationId?: string;
}

const HybridRecommender = () => {
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userAnalyses, setUserAnalyses] = useState<any[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  // Generate session ID for non-authenticated users
  const [sessionId] = useState(() => {
    if (typeof window !== 'undefined') {
      let stored = localStorage.getItem('naiqo_session_id');
      if (!stored) {
        stored = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('naiqo_session_id', stored);
      }
      return stored;
    }
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  });

  useEffect(() => {
    loadUserAnalyses();
  }, [user]);

  const loadUserAnalyses = async () => {
    try {
      // Check if nail_analysis table exists by attempting to query it
      const { data, error } = await supabase
        .from('nail_analysis' as any)
        .select('*')
        .or(`user_id.eq.${user?.id || 'null'},session_id.eq.${sessionId}`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        logError('HybridRecommender:loadUserAnalyses', error);
        setUserAnalyses([]);
        return;
      }
      setUserAnalyses(data || []);
    } catch (error) {
      logError('HybridRecommender:loadUserAnalyses', error);
      setUserAnalyses([]);
    }
  };

  const generateRecommendations = async (analysisId?: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('hybrid-recommender', {
        body: {
          userId: user?.id,
          sessionId,
          analysisId,
          preferences: {}
        }
      });

      if (error) throw error;
      
      setRecommendations(data);
      toast({
        title: "Recomendaciones Generadas",
        description: "Se han creado recomendaciones personalizadas basadas en tu historial.",
      });
    } catch (error) {
      logError('HybridRecommender:generateRecommendations', error);
      toast({
        title: "Error",
        description: "No se pudieron generar las recomendaciones. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'alta': return 'bg-red-100 text-red-800 border-red-200';
      case 'media': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'baja': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: number) => {
    if (priority >= 4) return <AlertTriangle className="w-4 h-4 text-red-500" />;
    if (priority >= 3) return <TrendingUp className="w-4 h-4 text-yellow-500" />;
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  if (userAnalyses.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader className="text-center">
            <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <CardTitle>Recomendador Híbrido de Tratamientos</CardTitle>
            <CardDescription>
              Necesitas realizar al menos un análisis de uñas para recibir recomendaciones personalizadas
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => window.location.href = '/analisis-ungueal'}>
              Realizar Análisis de Uñas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">
            Recomendador Híbrido
          </h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Recomendaciones personalizadas de tratamientos y productos basadas en tu historial de análisis
        </p>
      </div>

      {/* Analysis History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5" />
            Tu Historial de Análisis
          </CardTitle>
          <CardDescription>
            Basamos las recomendaciones en tus análisis anteriores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userAnalyses.slice(0, 6).map((analysis) => (
              <Card key={analysis.id} className="border-2 hover:border-primary/20 transition-colors">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline">
                      {new Date(analysis.created_at).toLocaleDateString()}
                    </Badge>
                    <Badge className={getUrgencyColor(analysis.severity_score > 7 ? 'alta' : analysis.severity_score > 4 ? 'media' : 'baja')}>
                      Severidad {analysis.severity_score}/10
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {analysis.detected_issues?.length || 0} problemas detectados
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => generateRecommendations(analysis.id)}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Generar Recomendaciones'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {!recommendations && (
            <div className="text-center mt-6">
              <Button 
                onClick={() => generateRecommendations()}
                disabled={isLoading}
                size="lg"
                className="bg-gradient-primary text-white hover:shadow-brand"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generando Recomendaciones...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generar Recomendaciones Globales
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      {recommendations && (
        <div className="space-y-6">
          {/* Overall Recommendation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Recomendación General
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {recommendations.overallRecommendation}
              </p>
              
              <div className="flex items-center gap-6 mt-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Euro className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold">€{recommendations.estimatedTotalCost.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold">{recommendations.estimatedTotalDuration} min</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommended Products */}
          <div className="grid md:grid-cols-2 gap-6">
            {recommendations.recommendedProducts.map((rec, index) => (
              <Card key={index} className="border-2 hover:border-primary/20 transition-all duration-300">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {getPriorityIcon(rec.priority)}
                        {rec.productName}
                      </CardTitle>
                      <CardDescription>
                        {rec.product.category} • {rec.product.subcategory}
                      </CardDescription>
                    </div>
                    <Badge className={getUrgencyColor(rec.urgency)}>
                      {rec.urgency.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {rec.product.description}
                  </p>
                  
                  <Separator className="my-4" />
                  
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium mb-1">¿Por qué lo recomendamos?</h4>
                      <p className="text-sm text-muted-foreground">{rec.reasoning}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-1">Resultados esperados</h4>
                      <p className="text-sm text-muted-foreground">{rec.expectedResults}</p>
                    </div>
                    
                    {rec.product.benefits && rec.product.benefits.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Beneficios</h4>
                        <div className="flex flex-wrap gap-1">
                          {rec.product.benefits.map((benefit, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {benefit}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>€{rec.product.price?.toFixed(2)}</span>
                      <span>{rec.product.duration_minutes} min</span>
                    </div>
                    <Badge>Prioridad {rec.priority}/5</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Follow-up and Prevention */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Consejos de Seguimiento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {recommendations.followUpAdvice}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  Tips de Prevención
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {recommendations.preventionTips.map((tip, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default HybridRecommender;