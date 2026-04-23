import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, Calendar, Package, AlertTriangle, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logError } from '@/lib/logger';

interface PredictionData {
  type: string;
  currentPeriod: {
    totalAppointments?: number;
    totalRecommendations?: number;
    averageDaily?: number;
    topServices?: Array<{service: string; count: number; percentage: number}>;
    topProducts?: Array<{product: string; count: number}>;
    revenue?: number;
    categoryTrends?: Array<{category: string; count: number}>;
  };
  predictions: {
    nextPeriodForecast: {
      expectedGrowth: number;
      totalPredicted: number;
      peakDays: string[];
      lowDays: string[];
    };
    recommendations: Array<{
      type: string;
      priority: string;
      action: string;
      impact: string;
    }>;
    insights: string[];
  };
  trends: Array<{date: string; appointments?: number}>;
}

const DemandPrediction = () => {
  const [predictionData, setPredictionData] = useState<PredictionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeframe, setTimeframe] = useState('30');
  const [analysisType, setAnalysisType] = useState('services');

  const runPrediction = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('demand-prediction', {
        body: { timeframe, analysisType }
      });

      if (error) throw error;

      setPredictionData(data);
      toast.success('Predicción de demanda generada exitosamente');
    } catch (error) {
      logError('DemandPrediction:runPrediction', error);
      toast.error('Error al generar la predicción de demanda');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runPrediction();
  }, [timeframe, analysisType]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'stock': return Package;
      case 'staffing': return Calendar;
      case 'marketing': return TrendingUp;
      case 'pricing': return DollarSign;
      default: return CheckCircle;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Predicción de Demanda
          </h1>
          <p className="text-muted-foreground mt-2">
            Analiza patrones históricos y predice necesidades futuras para optimizar tu negocio
          </p>
        </div>
        
        <div className="flex gap-2">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background"
          >
            <option value="7">Últimos 7 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 90 días</option>
          </select>
          
          <Button onClick={runPrediction} disabled={isLoading}>
            {isLoading ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Analizando...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4 mr-2" />
                Actualizar Predicción
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs value={analysisType} onValueChange={setAnalysisType} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="services">Servicios</TabsTrigger>
          <TabsTrigger value="products">Productos</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-6">
          {predictionData?.type === 'services' && (
            <>
              {/* Current Period Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Citas</CardDescription>
                    <CardTitle className="text-2xl">
                      {predictionData.currentPeriod.totalAppointments || 0}
                    </CardTitle>
                  </CardHeader>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Promedio Diario</CardDescription>
                    <CardTitle className="text-2xl">
                      {predictionData.currentPeriod.averageDaily || 0}
                    </CardTitle>
                  </CardHeader>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Ingresos Totales</CardDescription>
                    <CardTitle className="text-2xl">
                      ${predictionData.currentPeriod.revenue?.toFixed(0) || 0}
                    </CardTitle>
                  </CardHeader>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Crecimiento Predicho</CardDescription>
                    <CardTitle className="text-2xl text-green-600">
                      +{predictionData.predictions.nextPeriodForecast.expectedGrowth}%
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* Top Services */}
              <Card>
                <CardHeader>
                  <CardTitle>Servicios Más Demandados</CardTitle>
                  <CardDescription>Últimos {timeframe} días</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {predictionData.currentPeriod.topServices?.map((service, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <span className="font-medium">{service.service}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            {service.count} citas
                          </span>
                        </div>
                        <Badge variant="secondary">{service.percentage}%</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          {predictionData?.type === 'products' && (
            <>
              {/* Product Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Recomendaciones</CardDescription>
                    <CardTitle className="text-2xl">
                      {predictionData.currentPeriod.totalRecommendations || 0}
                    </CardTitle>
                  </CardHeader>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Crecimiento Predicho</CardDescription>
                    <CardTitle className="text-2xl text-green-600">
                      +{predictionData.predictions.nextPeriodForecast.expectedGrowth}%
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* Top Products */}
              <Card>
                <CardHeader>
                  <CardTitle>Productos Más Recomendados</CardTitle>
                  <CardDescription>Últimos {timeframe} días</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {predictionData.currentPeriod.topProducts?.slice(0, 5).map((product, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="font-medium">{product.product}</span>
                        <Badge variant="secondary">{product.count} veces</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {predictionData && (
        <>
          {/* Forecast */}
          <Card>
            <CardHeader>
              <CardTitle>Predicción para los Próximos 30 Días</CardTitle>
              <CardDescription>Basado en análisis de patrones históricos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Días de Mayor Demanda</h4>
                  <div className="flex gap-2 flex-wrap">
                    {predictionData.predictions.nextPeriodForecast.peakDays.map((day, index) => (
                      <Badge key={index} variant="destructive">{day}</Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Días de Menor Demanda</h4>
                  <div className="flex gap-2 flex-wrap">
                    {predictionData.predictions.nextPeriodForecast.lowDays.map((day, index) => (
                      <Badge key={index} variant="secondary">{day}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Recomendaciones de Acción</CardTitle>
              <CardDescription>Acciones sugeridas para optimizar tu negocio</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {predictionData.predictions.recommendations.map((rec, index) => {
                  const IconComponent = getTypeIcon(rec.type);
                  return (
                    <div key={index} className="flex items-start gap-3 p-4 border rounded-lg">
                      <IconComponent className="h-5 w-5 mt-0.5 text-primary" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{rec.action}</span>
                          <Badge variant={getPriorityColor(rec.priority)}>
                            {rec.priority === 'high' ? 'Alta' : 
                             rec.priority === 'medium' ? 'Media' : 'Baja'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{rec.impact}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Insights Clave</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {predictionData.predictions.insights.map((insight, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
                    <span className="text-sm">{insight}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default DemandPrediction;