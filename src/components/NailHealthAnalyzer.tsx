import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Camera, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  Eye,
  Clock,
  TrendingUp,
  Shield,
  WifiOff,
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDemoMode } from '@/hooks/useDemoMode';
import { logError } from '@/lib/logger';
import { 
  validateImage, 
  compressImage, 
  analyzeImageQuality,
  generateImageHash,
  getCachedResult,
  setCachedResult,
  isOnline,
  queueImageForLater,
  getOfflineQueue,
  clearOfflineQueueItem
} from '@/lib/imageCompression';
import { AnalysisProgress, AnalysisStage } from '@/components/AnalysisProgress';
import { PhotoTips } from '@/components/PhotoTips';

interface AnalysisResult {
  analysisId: string;
  detected_issues: string[];
  severity_score: number;
  confidence_score: number;
  detailed_analysis: string;
  recommendations: string[];
  requires_medical_attention: boolean;
  summary: string;
  imageUrl: string;
  timestamp: string;
}

const TIMEOUT_WARNING_MS = 10000;
const TIMEOUT_ERROR_MS = 30000;

const NailHealthAnalyzer = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [analysisStage, setAnalysisStage] = useState<AnalysisStage>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisStartTime, setAnalysisStartTime] = useState<number | undefined>();
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [sessionId] = useState(() => `nail_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [imageHash, setImageHash] = useState<string>('');
  const [imageWarning, setImageWarning] = useState<string>('');
  const [compressionInfo, setCompressionInfo] = useState<string>('');
  const [online, setOnline] = useState(isOnline());
  const [pendingOffline, setPendingOffline] = useState(getOfflineQueue().length);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();
  const { isDemoMode, getDemoAnalysisResult, addDemoAnalysis } = useDemoMode();

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      const queue = getOfflineQueue();
      if (queue.length > 0) {
        toast({
          title: "Conexión restaurada",
          description: `Tienes ${queue.length} foto(s) pendiente(s) de analizar`,
        });
      }
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate
    const validation = validateImage(file);
    if (!validation.isValid) {
      toast({
        title: "Error de imagen",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    setAnalysisStage('compressing');
    setImageWarning('');
    setCompressionInfo('');

    try {
      // Compress image
      const compressed = await compressImage(file);
      const savedSize = ((compressed.originalSize - compressed.compressedSize) / compressed.originalSize * 100).toFixed(0);
      setCompressionInfo(`Optimizada: ${(compressed.compressedSize / 1024).toFixed(0)}KB (${savedSize}% menor)`);

      // Analyze quality
      const quality = await analyzeImageQuality(compressed.file);
      if (quality.warning) {
        setImageWarning(quality.warning);
      }

      // Generate hash for caching
      const hash = await generateImageHash(compressed.file);
      setImageHash(hash);

      // Check cache
      const cached = getCachedResult(hash);
      if (cached) {
        toast({
          title: "Resultado instantáneo",
          description: "Ya analizaste esta imagen anteriormente",
        });
        setAnalysisResult(cached as AnalysisResult);
        setShowConfirmation(true);
        setAnalysisStage('complete');
        
        const previewUrl = URL.createObjectURL(compressed.file);
        setImagePreview(previewUrl);
        setSelectedImage(compressed.file);
        return;
      }

      setSelectedImage(compressed.file);
      const previewUrl = URL.createObjectURL(compressed.file);
      setImagePreview(previewUrl);
      setAnalysisResult(null);
      setAnalysisStage('idle');
    } catch (error) {
      logError('NailHealthAnalyzer:compressImage', error);
      toast({
        title: "Error al procesar imagen",
        description: "No se pudo preparar la imagen. Intenta con otra.",
        variant: "destructive",
      });
      setAnalysisStage('idle');
    }
  };

  const uploadImageToSupabase = async (file: File): Promise<string> => {
    const fileName = `${sessionId}_${Date.now()}.jpg`;
    
    // Simulate progress for UX (Supabase doesn't provide real progress)
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      const { data, error } = await supabase.storage
        .from('nail-images')
        .upload(fileName, file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (error) {
        logError('NailHealthAnalyzer:uploadImage', error);
        throw new Error('Error al subir la imagen');
      }

      const { data: urlData } = supabase.storage
        .from('nail-images')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }
  };

  const analyzeNailHealth = async () => {
    if (!selectedImage) {
      toast({
        title: "No hay imagen",
        description: "Por favor, selecciona una imagen primero",
        variant: "destructive",
      });
      return;
    }

    if (!consentAccepted) {
      toast({
        title: "Consentimiento requerido",
        description: "Por favor, acepta el consentimiento para continuar",
        variant: "destructive",
      });
      return;
    }

    // Demo mode: instant fake analysis
    if (isDemoMode) {
      setAnalysisStartTime(Date.now());
      setAnalysisStage('analyzing');
      
      // Simulate 1 second delay for realism
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const demoResult = getDemoAnalysisResult();
      const result: AnalysisResult = {
        analysisId: `demo-${Date.now()}`,
        detected_issues: [demoResult.condition],
        severity_score: 100 - demoResult.healthScore,
        confidence_score: demoResult.confidence,
        detailed_analysis: `Análisis demo: Se detectó ${demoResult.condition.toLowerCase()} con un nivel de severidad ${demoResult.severity}.`,
        recommendations: demoResult.recommendations,
        requires_medical_attention: demoResult.healthScore < 70,
        summary: `Estado general: ${demoResult.condition}`,
        imageUrl: imagePreview,
        timestamp: new Date().toISOString(),
      };
      
      addDemoAnalysis({
        client_name: 'Cliente Demo',
        image_url: imagePreview,
        diagnosis: { condition: demoResult.condition, severity: demoResult.severity, confidence: demoResult.confidence },
        recommendations: demoResult.recommendations,
      });
      
      setAnalysisResult(result);
      setShowConfirmation(true);
      setAnalysisStage('complete');
      
      toast({
        title: "¡Análisis completado!",
        description: "Modo demo: resultado instantáneo",
      });
      return;
    }

    // Check offline
    if (!online) {
      setAnalysisStage('offline');
      try {
        await queueImageForLater(selectedImage, sessionId);
        setPendingOffline(prev => prev + 1);
        toast({
          title: "Foto guardada",
          description: "Se analizará cuando tengas conexión a internet",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudo guardar la foto localmente",
          variant: "destructive",
        });
      }
      return;
    }

    setAnalysisStartTime(Date.now());
    setUploadProgress(0);
    setAnalysisStage('uploading');

    // Set timeout warning
    timeoutRef.current = setTimeout(() => {
      setAnalysisStage('timeout');
    }, TIMEOUT_WARNING_MS);

    try {
      const imageUrl = await uploadImageToSupabase(selectedImage);

      setAnalysisStage('analyzing');

      const { data, error } = await supabase.functions.invoke('analyze-nail', {
        body: {
          imageUrl: imageUrl,
          sessionId: sessionId
        },
      });

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (error) throw error;

      setAnalysisStage('preparing');

      // Small delay for UX
      await new Promise(resolve => setTimeout(resolve, 500));

      const result = data as AnalysisResult;
      setAnalysisResult(result);
      setShowConfirmation(true);
      setAnalysisStage('complete');

      // Cache result
      if (imageHash) {
        setCachedResult(imageHash, result);
      }

      toast({
        title: "¡Análisis completado!",
        description: "Los resultados están listos para revisar",
      });

    } catch (error) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      logError('NailHealthAnalyzer:analyzeNailHealth', error);
      setAnalysisStage('error');
    }
  };

  const handleRetry = () => {
    setAnalysisStage('idle');
    analyzeNailHealth();
  };

  const getSeverityColor = (score: number) => {
    if (score < 25) return 'text-green-600';
    if (score < 50) return 'text-yellow-600';
    if (score < 75) return 'text-orange-600';
    return 'text-red-600';
  };

  const getSeverityLabel = (score: number) => {
    if (score < 25) return 'Excelente';
    if (score < 50) return 'Bueno';
    if (score < 75) return 'Moderado';
    return 'Requiere Atención';
  };

  const resetAnalysis = () => {
    setSelectedImage(null);
    setImagePreview('');
    setAnalysisResult(null);
    setConsentAccepted(false);
    setShowConfirmation(false);
    setAnalysisStage('idle');
    setImageWarning('');
    setCompressionInfo('');
    setImageHash('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isAnalyzing = analysisStage !== 'idle' && analysisStage !== 'complete' && analysisStage !== 'error' && analysisStage !== 'offline';

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Análisis de Salud Ungueal
          <span className="bg-gradient-primary bg-clip-text text-transparent"> con IA</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Detecta problemas como hongos, fragilidad y manchas mediante análisis visual avanzado
        </p>
      </div>

      {/* Offline warning */}
      {!online && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <WifiOff className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">Sin conexión</AlertTitle>
          <AlertDescription className="text-yellow-700">
            Estás sin internet. Las fotos se guardarán y analizarán cuando vuelvas a conectarte.
          </AlertDescription>
        </Alert>
      )}

      {/* Pending offline queue */}
      {pendingOffline > 0 && online && (
        <Alert className="border-blue-200 bg-blue-50">
          <Zap className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Fotos pendientes</AlertTitle>
          <AlertDescription className="text-blue-700">
            Tienes {pendingOffline} foto(s) guardada(s) localmente esperando análisis.
          </AlertDescription>
        </Alert>
      )}

      {/* Photo tips */}
      <Card className="border-primary/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Tips para mejor foto
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <PhotoTips />
        </CardContent>
      </Card>

      {/* Área de carga de imagen */}
      <Card className="border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Sube una Imagen de tus Uñas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!imagePreview ? (
            <div className="text-center py-12">
              <Upload className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">Selecciona una imagen clara de tus uñas</p>
              <p className="text-muted-foreground mb-6">
                Se comprimirá automáticamente para un análisis más rápido
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg,image/webp"
                onChange={handleImageSelect}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                size="lg"
                className="bg-gradient-primary text-white hover:shadow-brand"
                disabled={isAnalyzing}
              >
                <Upload className="h-4 w-4 mr-2" />
                Seleccionar Imagen
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Vista previa"
                  className="w-full max-w-md mx-auto rounded-lg shadow-lg"
                />
                {compressionInfo && (
                  <Badge variant="secondary" className="absolute bottom-2 right-2 text-xs">
                    {compressionInfo}
                  </Badge>
                )}
              </div>

              {/* Image quality warning */}
              {imageWarning && (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-700">
                    {imageWarning}
                  </AlertDescription>
                </Alert>
              )}

              {/* Progress indicator */}
              <AnalysisProgress
                stage={analysisStage}
                uploadProgress={uploadProgress}
                startTime={analysisStartTime}
                onRetry={handleRetry}
                errorMessage={analysisStage === 'error' ? 'No se pudo completar el análisis. Por favor, inténtalo de nuevo.' : undefined}
              />

              {analysisStage === 'idle' && (
                <>
                  <Alert className="border-primary/20 bg-primary/5">
                    <Shield className="h-4 w-4" />
                    <AlertTitle>Consentimiento de Uso de Imagen</AlertTitle>
                    <AlertDescription className="space-y-3">
                      <p className="text-sm">
                        Al utilizar este servicio de análisis de salud ungueal, aceptas que:
                      </p>
                      <ul className="text-sm space-y-1 ml-4 list-disc">
                        <li>La imagen será procesada con fines de análisis médico asistido por IA</li>
                        <li>Los datos pueden ser utilizados para mejorar nuestros algoritmos</li>
                        <li>Este análisis es solo informativo y no sustituye la opinión médica profesional</li>
                      </ul>
                      <div className="flex items-center space-x-2 pt-2">
                        <Checkbox 
                          id="consent" 
                          checked={consentAccepted}
                          onCheckedChange={(checked) => setConsentAccepted(checked === true)}
                        />
                        <label
                          htmlFor="consent"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Acepto los términos y condiciones de uso
                        </label>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-2 justify-center">
                    <Button onClick={resetAnalysis} variant="outline">
                      Cambiar Imagen
                    </Button>
                    <Button
                      onClick={analyzeNailHealth}
                      disabled={!consentAccepted}
                      className="bg-gradient-primary text-white hover:shadow-brand"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Analizar Salud Ungueal
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mensaje de confirmación */}
      {showConfirmation && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">¡Análisis Recibido!</AlertTitle>
          <AlertDescription className="text-green-700">
            Tu imagen ha sido analizada exitosamente. Revisa los resultados detallados a continuación.
          </AlertDescription>
        </Alert>
      )}

      {/* Resultados del análisis */}
      {analysisResult && (
        <div className="space-y-6">
          {/* Resumen general */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Resultados del Análisis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gradient-card p-4 rounded-lg">
                <p className="text-lg font-medium text-center">
                  {analysisResult.summary}
                </p>
              </div>

              {/* Métricas principales */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Índice de Salud</span>
                    <span className={`text-sm font-bold ${getSeverityColor(analysisResult.severity_score)}`}>
                      {getSeverityLabel(analysisResult.severity_score)}
                    </span>
                  </div>
                  <Progress 
                    value={100 - analysisResult.severity_score} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Puntuación: {100 - analysisResult.severity_score}/100
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Confianza del Análisis</span>
                    <span className="text-sm font-bold">
                      {Math.round(analysisResult.confidence_score * 100)}%
                    </span>
                  </div>
                  <Progress 
                    value={analysisResult.confidence_score * 100} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Precisión del diagnóstico
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alerta médica si es necesario */}
          {analysisResult.requires_medical_attention && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-800">Atención Médica Recomendada</AlertTitle>
              <AlertDescription className="text-red-700">
                Basado en el análisis, recomendamos consultar con un dermatólogo o especialista en salud ungueal 
                para una evaluación profesional completa.
              </AlertDescription>
            </Alert>
          )}

          {/* Problemas detectados */}
          {analysisResult.detected_issues && analysisResult.detected_issues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Observaciones Detectadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.detected_issues.map((issue, index) => (
                    <Badge key={index} variant="outline" className="text-sm">
                      {issue}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recomendaciones */}
          {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recomendaciones Personalizadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysisResult.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Análisis detallado */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Análisis Detallado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {analysisResult.detailed_analysis}
              </p>
            </CardContent>
          </Card>

          {/* Botón para nuevo análisis */}
          <div className="text-center">
            <Button onClick={resetAnalysis} size="lg" variant="outline">
              Realizar Nuevo Análisis
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NailHealthAnalyzer;