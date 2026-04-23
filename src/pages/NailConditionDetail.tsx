import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, FileText, Image as ImageIcon, Stethoscope, TestTube, Pill } from 'lucide-react';
import NailImageGallery from '@/components/NailImageGallery';
import { logError } from '@/lib/logger';

interface NailCondition {
  id: string;
  name: string;
  synonyms: string[];
  category: string;
  short_definition: string;
  clinical_signs: string;
  differential_diagnosis: string[];
  recommended_tests: string[];
  treatment_summary: string;
  clinical_references: {
    dermnet_url?: string;
    aad_url?: string;
    pubmed_ids?: string[];
  };
}

const NailConditionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [condition, setCondition] = useState<NailCondition | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchCondition();
    }
  }, [id]);

  const fetchCondition = async () => {
    try {
      const { data, error } = await supabase
        .from('nail_conditions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Map database fields to interface format
      const mappedData: NailCondition = {
        ...data,
        clinical_references: {
          dermnet_url: data.dermnet_url,
          aad_url: data.aad_url,
          pubmed_ids: data.pubmed_refs
        }
      };
      
      setCondition(mappedData);
    } catch (error) {
      logError('NailConditionDetail:fetchCondition', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <Header />
        <main className="pt-20 pb-16">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/3" />
              <div className="h-64 bg-muted rounded" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!condition) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <Header />
        <main className="pt-20 pb-16">
          <div className="container mx-auto px-4 max-w-6xl text-center">
            <h1 className="text-2xl font-bold mb-4">Afección no encontrada</h1>
            <Link to="/nail-conditions">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al listado
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <Link to="/nail-conditions">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al listado
            </Button>
          </Link>

          <div className="mb-6">
            <h1 className="text-4xl font-bold mb-2">{condition.name}</h1>
            {condition.synonyms && condition.synonyms.length > 0 && (
              <p className="text-muted-foreground italic">
                También conocida como: {condition.synonyms.join(', ')}
              </p>
            )}
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid grid-cols-3 lg:grid-cols-6 w-full">
              <TabsTrigger value="overview">
                <FileText className="mr-2 h-4 w-4" />
                Resumen
              </TabsTrigger>
              <TabsTrigger value="clinical">
                <Stethoscope className="mr-2 h-4 w-4" />
                Signos Clínicos
              </TabsTrigger>
              <TabsTrigger value="diagnosis">
                <TestTube className="mr-2 h-4 w-4" />
                Diagnóstico
              </TabsTrigger>
              <TabsTrigger value="treatment">
                <Pill className="mr-2 h-4 w-4" />
                Tratamiento
              </TabsTrigger>
              <TabsTrigger value="gallery">
                <ImageIcon className="mr-2 h-4 w-4" />
                Galería
              </TabsTrigger>
              <TabsTrigger value="references">
                <ExternalLink className="mr-2 h-4 w-4" />
                Referencias
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Definición</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg">{condition.short_definition}</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="clinical">
              <Card>
                <CardHeader>
                  <CardTitle>Signos Clínicos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line">{condition.clinical_signs}</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="diagnosis">
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Diagnóstico Diferencial</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-2">
                      {condition.differential_diagnosis?.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Pruebas Recomendadas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-2">
                      {condition.recommended_tests?.map((test, index) => (
                        <li key={index}>{test}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="treatment">
              <Card>
                <CardHeader>
                  <CardTitle>Resumen de Tratamiento</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line">{condition.treatment_summary}</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="gallery">
              <NailImageGallery conditionId={condition.id} />
            </TabsContent>

            <TabsContent value="references">
              <Card>
                <CardHeader>
                  <CardTitle>Referencias Científicas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {condition.clinical_references?.dermnet_url && (
                    <div>
                      <h3 className="font-semibold mb-2">DermNet NZ</h3>
                      <a
                        href={condition.clinical_references.dermnet_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-2"
                      >
                        {condition.clinical_references.dermnet_url}
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  )}

                  {condition.clinical_references?.aad_url && (
                    <div>
                      <h3 className="font-semibold mb-2">Academia Americana de Dermatología</h3>
                      <a
                        href={condition.clinical_references.aad_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-2"
                      >
                        {condition.clinical_references.aad_url}
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  )}

                  {condition.clinical_references?.pubmed_ids && condition.clinical_references.pubmed_ids.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Artículos en PubMed</h3>
                      <ul className="space-y-2">
                        {condition.clinical_references.pubmed_ids.map((pmid) => (
                          <li key={pmid}>
                            <a
                              href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-2"
                            >
                              PMID: {pmid}
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NailConditionDetail;
