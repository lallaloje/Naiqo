import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Upload, Camera, Sparkles, CheckCircle, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";

export const DemoSection = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setAnalysisComplete(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = () => {
    if (!selectedImage) {
      toast.error("Por favor, sube una imagen primero");
      return;
    }

    setIsAnalyzing(true);
    
    // Simulate AI analysis
    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalysisComplete(true);
      toast.success("¡Análisis completado con éxito!");
    }, 3000);
  };

  const analysisResults = {
    healthScore: 85,
    issues: [
      { type: "Deshidratación leve", severity: "low", recommendation: "Aplicar aceite nutritivo" },
      { type: "Cutículas secas", severity: "medium", recommendation: "Tratamiento hidratante profundo" }
    ],
    recommendations: [
      "Tratamiento hidratante intensivo",
      "Manicura francesa con base fortalecedora", 
      "Aplicación de aceite de jojoba"
    ],
    colorSuggestions: [
      { color: "#FFB6C1", name: "Rosa Suave", confidence: 95 },
      { color: "#E6E6FA", name: "Lavanda Clásico", confidence: 88 },
      { color: "#FFF0F5", name: "Rosa Nácar", confidence: 82 }
    ]
  };

  return (
    <section id="demo" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 text-primary border-primary">
            Prueba Gratuita
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Experimenta el
            <span className="bg-gradient-primary bg-clip-text text-transparent"> Poder de NAIQO</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Sube una foto de uñas y descubre cómo nuestra IA puede transformar 
            tu diagnóstico y recomendaciones profesionales.
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <Card className="border-2 border-dashed border-primary/30 hover:border-primary/50 transition-colors">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center space-x-2">
                <Camera className="w-6 h-6 text-primary" />
                <span>Análisis de Imagen</span>
              </CardTitle>
              <CardDescription>
                Sube una foto de uñas para obtener un diagnóstico instantáneo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!selectedImage ? (
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Arrastra una imagen aquí o haz clic para seleccionar
                  </p>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <Button variant="outline" onClick={() => document.getElementById('image-upload')?.click()}>
                    Seleccionar Imagen
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-lg overflow-hidden">
                    <img
                      src={selectedImage}
                      alt="Uñas para análisis"
                      className="w-full h-64 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                  </div>
                  <Button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="w-full bg-gradient-primary text-white hover:shadow-brand"
                  >
                    {isAnalyzing ? (
                      <>
                        <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                        Analizando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Analizar con IA
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card className="bg-gradient-card border-0 shadow-brand">
            <CardHeader>
              <CardTitle className="flex items-center justify-center space-x-2">
                <Sparkles className="w-6 h-6 text-primary" />
                <span>Resultados del Análisis</span>
              </CardTitle>
              <CardDescription className="text-center">
                Diagnóstico profesional generado por IA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!analysisComplete ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Info className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Sube una imagen y haz clic en "Analizar" para ver los resultados</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Health Score */}
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-2">
                      {analysisResults.healthScore}%
                    </div>
                    <p className="text-muted-foreground">Puntuación de Salud</p>
                  </div>

                  {/* Issues */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2 text-orange-500" />
                      Problemas Detectados
                    </h4>
                    <div className="space-y-2">
                      {analysisResults.issues.map((issue, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
                          <span className="text-sm">{issue.type}</span>
                          <Badge variant={issue.severity === 'low' ? 'secondary' : 'destructive'}>
                            {issue.severity === 'low' ? 'Leve' : 'Moderado'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                      Recomendaciones
                    </h4>
                    <div className="space-y-2">
                      {analysisResults.recommendations.map((rec, index) => (
                        <div key={index} className="flex items-center p-3 bg-white/50 rounded-lg">
                          <CheckCircle className="w-4 h-4 mr-3 text-green-500" />
                          <span className="text-sm">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Color Suggestions */}
                  <div>
                    <h4 className="font-semibold mb-3">Colores Recomendados</h4>
                    <div className="grid grid-cols-3 gap-3">
                      {analysisResults.colorSuggestions.map((color, index) => (
                        <div key={index} className="text-center">
                          <div
                            className="w-full h-12 rounded-lg mb-2 border-2 border-white shadow-sm"
                            style={{ backgroundColor: color.color }}
                          ></div>
                          <p className="text-xs font-medium">{color.name}</p>
                          <p className="text-xs text-muted-foreground">{color.confidence}%</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            ¿Impresionado con los resultados? Accede a todas las funcionalidades
          </p>
          <Button size="lg" className="bg-gradient-primary text-white hover:shadow-brand">
            Comenzar Prueba Gratuita
          </Button>
        </div>
      </div>
    </section>
  );
};